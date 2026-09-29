from typing import List, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.state_machine import is_transition_valid
from app.models.models import (
    User, Application, Document, ApplicationQuery,
    Inspection, ApplicationStatusHistory, AuditLog, Notification
)
from app.models.enums import (
    UserRole, ApplicationStatus, DocumentReviewStatus,
    QueryStatus, InspectionStatus, RiskLevel
)
from app.schemas.application import (
    ApplicationRead, ApplicationListItem, OfficerDashboardStats
)
from app.schemas.document import DocumentReviewRequest, DocumentRead
from app.schemas.query_inspection import (
    QueryCreateRequest, QueryRead, InspectionCreateRequest,
    InspectionUpdateRequest, InspectionRead, StatusChangeRequest,
    StatusHistoryRead
)
from app.schemas.common import ApiResponse, PaginatedData
from app.services.application_service import application_service
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.webhook_service import webhook_service
from app.services.risk_engine import risk_engine

router = APIRouter(prefix="/officer", tags=["Officer Portal"])

@router.get("/dashboard", response_model=ApiResponse[OfficerDashboardStats])
def get_officer_dashboard_stats(
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    apps = db.query(Application).all()
    stats = OfficerDashboardStats(
        total_applications=len(apps),
        new_submissions=sum(1 for a in apps if a.status == ApplicationStatus.SUBMITTED),
        under_review=sum(1 for a in apps if a.status == ApplicationStatus.UNDER_REVIEW),
        document_queries=sum(1 for a in apps if a.status == ApplicationStatus.DOCUMENT_QUERY),
        inspection_required=sum(1 for a in apps if a.status == ApplicationStatus.INSPECTION_REQUIRED),
        inspection_scheduled=sum(1 for a in apps if a.status == ApplicationStatus.INSPECTION_SCHEDULED),
        approved=sum(1 for a in apps if a.status == ApplicationStatus.APPROVED),
        rejected=sum(1 for a in apps if a.status == ApplicationStatus.REJECTED),
        withdrawn=sum(1 for a in apps if a.status == ApplicationStatus.WITHDRAWN)
    )
    return ApiResponse(
        success=True,
        data=stats,
        message="Officer dashboard stats calculated."
    )

@router.get("/applications", response_model=ApiResponse[PaginatedData[ApplicationListItem]])
def list_officer_applications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status_filter: Optional[ApplicationStatus] = None,
    district: Optional[str] = None,
    assigned_to_me: Optional[bool] = None,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    query = db.query(Application)

    if assigned_to_me:
        query = query.filter(Application.assigned_officer_id == current_user.id)

    if status_filter:
        query = query.filter(Application.status == status_filter)

    if search:
        search_term = f"%{search.strip()}%"
        query = query.join(Application.business).join(Application.applicant).filter(
            or_(
                Application.application_number.ilike(search_term),
                Application.business.has(business_name=search.strip()) | Application.business.has(Application.business.property.mapper.class_.business_name.ilike(search_term)),
                Application.applicant.has(applicant_name=search.strip()) | Application.applicant.has(Application.applicant.property.mapper.class_.applicant_name.ilike(search_term))
            )
        )

    if district:
        query = query.join(Application.business).filter(Application.business.has(district=district))

    total = query.count()
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    offset = (page - 1) * limit
    apps = query.order_by(desc(Application.updated_at)).offset(offset).limit(limit).all()

    items = []
    for a in apps:
        biz_name = a.business.business_name if a.business else "Untitled Business"
        app_name = a.applicant.applicant_name if a.applicant else "Unknown Applicant"
        items.append(ApplicationListItem(
            id=a.id,
            application_number=a.application_number,
            external_reference_id=a.external_reference_id,
            business_name=biz_name,
            applicant_name=app_name,
            application_type=a.application_type,
            status=a.status,
            state=a.business.state if a.business else "",
            district=a.business.district if a.business else "",
            submission_date=a.submission_date,
            last_status_updated_at=a.last_status_updated_at,
            assigned_officer_name=a.assigned_officer.name if a.assigned_officer else None,
            risk_level=a.risk_level or RiskLevel.LOW,
            open_queries_count=sum(1 for q in (a.queries or []) if q.status == QueryStatus.OPEN),
            inspection_status=a.inspections[0].status.value if a.inspections else None,
            created_at=a.created_at
        ))

    return ApiResponse(
        success=True,
        data=PaginatedData(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        ),
        message="Applications retrieved."
    )

@router.get("/applications/{app_id_or_number}", response_model=ApiResponse[ApplicationRead])
def get_officer_application_detail(
    app_id_or_number: str,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    return ApiResponse(
        success=True,
        data=application_service.format_application_read(app, db),
        message="Application details loaded."
    )

@router.post("/applications/{app_id_or_number}/status", response_model=ApiResponse[ApplicationRead])
async def update_application_status(
    app_id_or_number: str,
    req: StatusChangeRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    valid, msg = is_transition_valid(app.status, req.new_status, current_user.role)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    old_status = app.status
    app.status = req.new_status
    app.last_status_updated_at = datetime.now(timezone.utc)
    app.updated_at = datetime.now(timezone.utc)
    app.risk_level = risk_engine.calculate_priority(app)

    # Status History
    status_hist = ApplicationStatusHistory(
        application_id=app.id,
        old_status=old_status,
        new_status=req.new_status,
        changed_by=f"{current_user.name} ({current_user.role.value})",
        reason=req.reason or f"Status updated to {req.new_status.value} by officer.",
        visible_to_applicant=req.visible_to_applicant
    )
    db.add(status_hist)

    # In-app notification to applicant
    if app.applicant and app.applicant.user_id:
        notif_type = "SUCCESS" if req.new_status == ApplicationStatus.APPROVED else ("DANGER" if req.new_status == ApplicationStatus.REJECTED else "INFO")
        notification_service.send(
            db,
            user_id=app.applicant.user_id,
            title=f"Application Status Updated: {req.new_status.value}",
            message=req.reason or f"Your application {app.application_number} status has changed to {req.new_status.value}.",
            notification_type=notif_type,
            link=f"/applicant/applications/{app.application_number}"
        )

    audit_service.log(
        db,
        action="STATUS_CHANGED",
        entity_type="APPLICATION",
        entity_id=app.id,
        user_id=current_user.id,
        metadata={"old_status": old_status.value, "new_status": req.new_status.value, "reason": req.reason},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(app)

    # Webhook
    await webhook_service.dispatch_event(
        event_name="APPLICATION_STATUS_CHANGED",
        application_number=app.application_number,
        external_reference_id=app.external_reference_id,
        old_status=old_status.value,
        new_status=req.new_status.value,
        metadata={"reason": req.reason}
    )

    return ApiResponse(
        success=True,
        data=application_service.format_application_read(app, db),
        message=f"Application status updated to {req.new_status.value}."
    )

@router.post("/applications/{app_id_or_number}/documents/{doc_id}/review", response_model=ApiResponse[DocumentRead])
async def review_document(
    app_id_or_number: str,
    doc_id: str,
    req: DocumentReviewRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    doc = db.query(Document).filter(Document.id == doc_id, Document.application_id == app.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if req.review_status in (DocumentReviewStatus.REJECTED, DocumentReviewStatus.NEEDS_CORRECTION) and not req.officer_comment:
        raise HTTPException(status_code=400, detail="Officer comment is mandatory when rejecting or requesting correction.")

    doc.review_status = req.review_status
    doc.officer_comment = req.officer_comment
    doc.reviewed_at = datetime.now(timezone.utc)

    # If document was rejected or needs correction, transition application to DOCUMENT_QUERY if under review
    if req.review_status in (DocumentReviewStatus.REJECTED, DocumentReviewStatus.NEEDS_CORRECTION):
        if app.status in (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SUBMITTED):
            old_status = app.status
            app.status = ApplicationStatus.DOCUMENT_QUERY
            app.last_status_updated_at = datetime.now(timezone.utc)
            
            # Status history
            db.add(ApplicationStatusHistory(
                application_id=app.id,
                old_status=old_status,
                new_status=ApplicationStatus.DOCUMENT_QUERY,
                changed_by=f"{current_user.name} (Officer)",
                reason=f"Document '{doc.requirement.name if doc.requirement else doc.requirement_id}' marked as {req.review_status.value}: {req.officer_comment}",
                visible_to_applicant=True
            ))

            # Notify applicant
            if app.applicant and app.applicant.user_id:
                notification_service.send(
                    db,
                    user_id=app.applicant.user_id,
                    title="Document Needs Attention",
                    message=f"Document '{doc.requirement.name if doc.requirement else doc.requirement_id}' was marked as {req.review_status.value}. Reason: {req.officer_comment}",
                    notification_type="WARNING",
                    link=f"/applicant/applications/{app.application_number}"
                )

            # Fire Webhook
            await webhook_service.dispatch_event(
                event_name="APPLICATION_STATUS_CHANGED",
                application_number=app.application_number,
                external_reference_id=app.external_reference_id,
                old_status=old_status.value,
                new_status=ApplicationStatus.DOCUMENT_QUERY.value,
                metadata={"document_id": doc.id, "reason": req.officer_comment}
            )

    app.risk_level = risk_engine.calculate_priority(app)

    audit_service.log(
        db,
        action="DOCUMENT_REVIEWED",
        entity_type="DOCUMENT",
        entity_id=doc.id,
        user_id=current_user.id,
        metadata={"review_status": req.review_status.value, "comment": req.officer_comment},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(doc)

    return ApiResponse(
        success=True,
        data=DocumentRead(
            id=doc.id,
            application_id=doc.application_id,
            requirement_id=doc.requirement_id,
            requirement_name=doc.requirement.name if doc.requirement else doc.requirement_id,
            original_filename=doc.original_filename,
            file_path=doc.file_path,
            mime_type=doc.mime_type,
            file_size=doc.file_size,
            upload_status=doc.upload_status,
            review_status=doc.review_status,
            officer_comment=doc.officer_comment,
            uploaded_at=doc.uploaded_at,
            reviewed_at=doc.reviewed_at
        ),
        message=f"Document review status updated to {req.review_status.value}."
    )

@router.post("/applications/{app_id_or_number}/queries", response_model=ApiResponse[QueryRead])
async def create_officer_query(
    app_id_or_number: str,
    req: QueryCreateRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    deadline = datetime.now(timezone.utc) + timedelta(days=req.deadline_days or 7)
    new_query = ApplicationQuery(
        application_id=app.id,
        officer_id=current_user.id,
        subject=req.subject,
        message=req.message,
        status=QueryStatus.OPEN,
        deadline_date=deadline
    )
    db.add(new_query)

    # Change status to DOCUMENT_QUERY if under review
    if app.status in (ApplicationStatus.UNDER_REVIEW, ApplicationStatus.SUBMITTED):
        old_status = app.status
        app.status = ApplicationStatus.DOCUMENT_QUERY
        app.last_status_updated_at = datetime.now(timezone.utc)
        
        db.add(ApplicationStatusHistory(
            application_id=app.id,
            old_status=old_status,
            new_status=ApplicationStatus.DOCUMENT_QUERY,
            changed_by=f"{current_user.name} (Officer)",
            reason=f"Official Query Raised: {req.subject}",
            visible_to_applicant=True
        ))

    # Notify applicant
    if app.applicant and app.applicant.user_id:
        notification_service.send(
            db,
            user_id=app.applicant.user_id,
            title=f"Action Required: {req.subject}",
            message=f"Officer has requested additional information: {req.message}",
            notification_type="WARNING",
            link=f"/applicant/applications/{app.application_number}"
        )

    audit_service.log(
        db,
        action="QUERY_CREATED",
        entity_type="QUERY",
        entity_id=app.id,
        user_id=current_user.id,
        metadata={"subject": req.subject},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(new_query)

    return ApiResponse(
        success=True,
        data=QueryRead.model_validate(new_query),
        message="Official query raised successfully."
    )

@router.put("/applications/{app_id_or_number}/queries/{query_id}/resolve", response_model=ApiResponse[QueryRead])
def resolve_query(
    app_id_or_number: str,
    query_id: str,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    query = db.query(ApplicationQuery).filter(ApplicationQuery.id == query_id).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found.")

    query.status = QueryStatus.RESOLVED
    db.commit()
    db.refresh(query)

    return ApiResponse(
        success=True,
        data=QueryRead.model_validate(query),
        message="Query marked as resolved."
    )

@router.post("/applications/{app_id_or_number}/inspections", response_model=ApiResponse[InspectionRead])
async def schedule_inspection(
    app_id_or_number: str,
    req: InspectionCreateRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    inspection = Inspection(
        application_id=app.id,
        officer_id=current_user.id,
        inspection_type=req.inspection_type,
        scheduled_date=req.scheduled_date,
        scheduled_time=req.scheduled_time,
        location=req.location,
        instructions=req.instructions,
        status=InspectionStatus.SCHEDULED
    )
    db.add(inspection)

    # Transition status to INSPECTION_SCHEDULED
    old_status = app.status
    app.status = ApplicationStatus.INSPECTION_SCHEDULED
    app.last_status_updated_at = datetime.now(timezone.utc)

    db.add(ApplicationStatusHistory(
        application_id=app.id,
        old_status=old_status,
        new_status=ApplicationStatus.INSPECTION_SCHEDULED,
        changed_by=f"{current_user.name} (Officer)",
        reason=f"Premises inspection scheduled on {req.scheduled_date} at {req.scheduled_time}.",
        visible_to_applicant=True
    ))

    # Notify applicant
    if app.applicant and app.applicant.user_id:
        notification_service.send(
            db,
            user_id=app.applicant.user_id,
            title="Premises Inspection Scheduled",
            message=f"Food Safety Officer inspection scheduled for {req.scheduled_date} at {req.scheduled_time} at your premises.",
            notification_type="INFO",
            link=f"/applicant/applications/{app.application_number}"
        )

    audit_service.log(
        db,
        action="INSPECTION_SCHEDULED",
        entity_type="INSPECTION",
        entity_id=app.id,
        user_id=current_user.id,
        metadata={"scheduled_date": req.scheduled_date, "scheduled_time": req.scheduled_time},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(inspection)

    # Webhook
    await webhook_service.dispatch_event(
        event_name="APPLICATION_STATUS_CHANGED",
        application_number=app.application_number,
        external_reference_id=app.external_reference_id,
        old_status=old_status.value,
        new_status=ApplicationStatus.INSPECTION_SCHEDULED.value,
        metadata={"scheduled_date": req.scheduled_date, "scheduled_time": req.scheduled_time}
    )

    return ApiResponse(
        success=True,
        data=InspectionRead.model_validate(inspection),
        message="Inspection scheduled successfully."
    )

@router.put("/applications/{app_id_or_number}/inspections/{inspection_id}", response_model=ApiResponse[InspectionRead])
def update_inspection_status(
    app_id_or_number: str,
    inspection_id: str,
    req: InspectionUpdateRequest,
    current_user: User = Depends(require_role([UserRole.OFFICER, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    inspection = db.query(Inspection).filter(Inspection.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection not found.")

    inspection.status = req.status
    if req.officer_notes is not None:
        inspection.officer_notes = req.officer_notes
    if req.status == InspectionStatus.COMPLETED:
        inspection.completed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(inspection)

    return ApiResponse(
        success=True,
        data=InspectionRead.model_validate(inspection),
        message=f"Inspection status updated to {req.status.value}."
    )
