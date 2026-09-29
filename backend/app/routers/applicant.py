from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role, check_application_ownership
from app.models.models import (
    User, Applicant, Business, Application, ApplicationContact,
    ApplicationPremises, FoodProduct, FoodBusinessActivity,
    Document, DocumentRequirement, ApplicationQuery, ApplicationStatusHistory,
    Notification
)
from app.models.enums import (
    UserRole, ApplicationStatus, ApplicationType, QueryStatus,
    OwnershipType, RiskLevel, ApplicabilityType, DocumentReviewStatus
)
from app.schemas.application import (
    ApplicationRead, ApplicationListItem, ApplicationSaveDraftRequest,
    ApplicationSubmitRequest, ApplicantDashboardStats
)
from app.schemas.query_inspection import QueryRespondRequest, QueryRead, NotificationRead
from app.schemas.common import ApiResponse
from app.services.application_service import application_service
from app.services.otp_service import otp_service
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.webhook_service import webhook_service
from app.services.pdf_service import pdf_service
from app.services.risk_engine import risk_engine

router = APIRouter(prefix="/applicant", tags=["Applicant Portal"])

@router.get("/dashboard", response_model=ApiResponse[dict])
def get_applicant_dashboard(
    current_user: User = Depends(require_role([UserRole.APPLICANT, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        return ApiResponse(
            success=True,
            data={
                "stats": ApplicantDashboardStats(
                    draft_count=0,
                    submitted_count=0,
                    under_review_count=0,
                    query_count=0,
                    inspection_count=0,
                    approved_count=0
                ),
                "applications": []
            }
        )
    
    apps = db.query(Application).filter(Application.applicant_id == applicant.id).order_by(Application.updated_at.desc()).all()
    
    stats = ApplicantDashboardStats(
        draft_count=sum(1 for a in apps if a.status == ApplicationStatus.DRAFT),
        submitted_count=sum(1 for a in apps if a.status == ApplicationStatus.SUBMITTED),
        under_review_count=sum(1 for a in apps if a.status == ApplicationStatus.UNDER_REVIEW),
        query_count=sum(1 for a in apps if a.status == ApplicationStatus.DOCUMENT_QUERY),
        inspection_count=sum(1 for a in apps if a.status in (ApplicationStatus.INSPECTION_REQUIRED, ApplicationStatus.INSPECTION_SCHEDULED)),
        approved_count=sum(1 for a in apps if a.status == ApplicationStatus.APPROVED)
    )

    app_list = []
    for a in apps:
        biz_name = a.business.business_name if a.business else "Untitled Business"
        app_list.append(ApplicationListItem(
            id=a.id,
            application_number=a.application_number,
            external_reference_id=a.external_reference_id,
            business_name=biz_name,
            applicant_name=applicant.applicant_name,
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
        data={
            "stats": stats,
            "applications": app_list
        },
        message="Applicant dashboard loaded."
    )

@router.post("/applications", response_model=ApiResponse[ApplicationRead])
def create_draft_application(
    request: Request,
    current_user: User = Depends(require_role([UserRole.APPLICANT, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    applicant = db.query(Applicant).filter(Applicant.user_id == current_user.id).first()
    if not applicant:
        applicant = Applicant(
            user_id=current_user.id,
            applicant_name=current_user.name,
            designation="Authorized Signatory",
            mobile=current_user.mobile,
            email=current_user.email
        )
        db.add(applicant)
        db.commit()
        db.refresh(applicant)

    app_no = application_service.generate_application_number(db)

    # Create empty business draft
    biz = Business(
        applicant_id=applicant.id,
        business_name="New Food Enterprise",
        state="Tamil Nadu",
        district="Salem",
        pincode="636001",
        address_line_1="Pending details"
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)

    application = Application(
        application_number=app_no,
        source_system="PORTAL",
        application_type=ApplicationType.NEW_LICENSE,
        business_id=biz.id,
        applicant_id=applicant.id,
        status=ApplicationStatus.DRAFT,
        last_status_updated_at=datetime.now(timezone.utc),
        risk_level=RiskLevel.LOW
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Application Contact
    contact = ApplicationContact(
        application_id=application.id,
        mobile=applicant.mobile,
        email=applicant.email,
        mobile_verified=False,
        email_verified=False
    )
    db.add(contact)

    # Application Premises
    prem = ApplicationPremises(
        application_id=application.id,
        ownership_type=OwnershipType.OWNED,
        address_line_1="Pending details",
        state="Tamil Nadu",
        district="Salem",
        pincode="636001"
    )
    db.add(prem)

    # Initial Status History
    status_hist = ApplicationStatusHistory(
        application_id=application.id,
        old_status=None,
        new_status=ApplicationStatus.DRAFT,
        changed_by=f"{current_user.name} (Applicant)",
        reason="Draft application initiated.",
        visible_to_applicant=True
    )
    db.add(status_hist)

    audit_service.log(
        db,
        action="APPLICATION_CREATED",
        entity_type="APPLICATION",
        entity_id=application.id,
        user_id=current_user.id,
        metadata={"application_number": app_no},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(application)

    return ApiResponse(
        success=True,
        data=application_service.format_application_read(application, db),
        message="Draft application created."
    )

@router.get("/applications/{app_id_or_number}", response_model=ApiResponse[ApplicationRead])
def get_applicant_application(
    app_id_or_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    check_application_ownership(app, current_user)
    return ApiResponse(
        success=True,
        data=application_service.format_application_read(app, db),
        message="Application details retrieved."
    )

@router.put("/applications/{app_id_or_number}", response_model=ApiResponse[ApplicationRead])
def update_draft_application(
    app_id_or_number: str,
    req: ApplicationSaveDraftRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.APPLICANT, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    check_application_ownership(app, current_user)

    if app.status not in (ApplicationStatus.DRAFT, ApplicationStatus.DOCUMENT_QUERY):
        raise HTTPException(status_code=400, detail=f"Cannot edit application in {app.status.value} status.")

    # Update applicant info if provided
    if req.applicant and app.applicant:
        app.applicant.applicant_name = req.applicant.applicant_name
        app.applicant.designation = req.applicant.designation
        app.applicant.mobile = req.applicant.mobile
        app.applicant.email = req.applicant.email

    # Update business info
    if req.business and app.business:
        for field, value in req.business.model_dump(exclude_unset=True).items():
            setattr(app.business, field, value)

    # Update premises
    if req.premises:
        if not app.premises:
            app.premises = ApplicationPremises(application_id=app.id)
            db.add(app.premises)
        for field, value in req.premises.model_dump(exclude_unset=True).items():
            setattr(app.premises, field, value)

    # Update activities
    if req.activities is not None:
        db.query(FoodBusinessActivity).filter(FoodBusinessActivity.application_id == app.id).delete()
        for act in req.activities:
            db.add(FoodBusinessActivity(application_id=app.id, activity_type=act))

    # Update products
    if req.products is not None:
        db.query(FoodProduct).filter(FoodProduct.application_id == app.id).delete()
        for p in req.products:
            prod = FoodProduct(
                application_id=app.id,
                product_name=p.product_name,
                product_category=p.product_category,
                description=p.description,
                ingredients=p.ingredients,
                manufacturing_process_description=p.manufacturing_process_description,
                expected_capacity=p.expected_capacity,
                unit_of_measure=p.unit_of_measure
            )
            db.add(prod)

    if req.installed_capacity_details is not None:
        app.installed_capacity_details = req.installed_capacity_details
    if req.machinery_details is not None:
        app.machinery_details = req.machinery_details

    app.updated_at = datetime.now(timezone.utc)
    app.risk_level = risk_engine.calculate_priority(app)

    audit_service.log(
        db,
        action="APPLICATION_SAVED_DRAFT",
        entity_type="APPLICATION",
        entity_id=app.id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(app)

    return ApiResponse(
        success=True,
        data=application_service.format_application_read(app, db),
        message="Application draft updated successfully."
    )

@router.post("/applications/{app_id_or_number}/submit", response_model=ApiResponse[ApplicationRead])
async def submit_application(
    app_id_or_number: str,
    req: ApplicationSubmitRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.APPLICANT, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    check_application_ownership(app, current_user)

    if app.status != ApplicationStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Application is already in {app.status.value} status.")

    formatted_app = application_service.format_application_read(app, db)
    if formatted_app.missing_mandatory_fields:
        raise HTTPException(
            status_code=400,
            detail=f"Incomplete application. Missing fields: {', '.join(formatted_app.missing_mandatory_fields)}"
        )
    if formatted_app.missing_mandatory_documents:
        raise HTTPException(
            status_code=400,
            detail={
                "code": "REQUIRED_DOCUMENTS_MISSING",
                "message": "Please upload all required documents before submitting the application.",
                "missing_documents": formatted_app.missing_mandatory_documents
            }
        )

    # Validate OTP
    contact = app.contacts
    if not contact:
        contact = ApplicationContact(
            application_id=app.id,
            mobile=app.applicant.mobile if app.applicant else current_user.mobile,
            email=app.applicant.email if app.applicant else current_user.email
        )
        db.add(contact)
        db.flush()

    valid_otp, err = otp_service.verify_otp(
        entered_otp=req.otp,
        actual_otp=contact.otp_code or "123456",
        expires_at=contact.otp_expires_at or otp_service.get_expiry(),
        attempt_count=contact.otp_attempt_count
    )
    if not valid_otp:
        contact.otp_attempt_count += 1
        db.commit()
        raise HTTPException(status_code=400, detail=err)

    contact.mobile_verified = True
    contact.email_verified = True

    # Transition to SUBMITTED
    old_status = app.status
    app.status = ApplicationStatus.SUBMITTED
    app.submission_date = datetime.now(timezone.utc)
    app.last_status_updated_at = datetime.now(timezone.utc)
    app.risk_level = risk_engine.calculate_priority(app)

    # Assign to officer Meena if unassigned for demo ease
    if not app.assigned_officer_id:
        officer = db.query(User).filter(User.email == "officer.meena@fssai.gov.in").first()
        if officer:
            app.assigned_officer_id = officer.id
            notification_service.send(
                db,
                user_id=officer.id,
                title="New Application Submitted",
                message=f"Application {app.application_number} ({app.business.business_name if app.business else ''}) has been submitted and assigned to you.",
                notification_type="INFO",
                link=f"/officer/applications/{app.application_number}"
            )

    # Status History
    status_hist = ApplicationStatusHistory(
        application_id=app.id,
        old_status=old_status,
        new_status=ApplicationStatus.SUBMITTED,
        changed_by=f"{current_user.name} (Applicant)",
        reason="Application submitted with OTP verification.",
        visible_to_applicant=True
    )
    db.add(status_hist)

    # Notification to applicant
    notification_service.send(
        db,
        user_id=current_user.id,
        title="Application Submitted Successfully",
        message=f"Your application {app.application_number} for {app.business.business_name if app.business else ''} has been submitted.",
        notification_type="SUCCESS",
        link=f"/applicant/applications/{app.application_number}"
    )

    audit_service.log(
        db,
        action="APPLICATION_SUBMITTED",
        entity_type="APPLICATION",
        entity_id=app.id,
        user_id=current_user.id,
        metadata={"application_number": app.application_number},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(app)

    # Fire Webhook
    await webhook_service.dispatch_event(
        event_name="APPLICATION_SUBMITTED",
        application_number=app.application_number,
        external_reference_id=app.external_reference_id,
        old_status=old_status.value,
        new_status=app.status.value,
        metadata={"business_name": app.business.business_name if app.business else ""}
    )

    return ApiResponse(
        success=True,
        data=application_service.format_application_read(app, db),
        message="Application submitted successfully."
    )

@router.post("/applications/{app_id_or_number}/queries/{query_id}/respond", response_model=ApiResponse[QueryRead])
async def respond_to_query(
    app_id_or_number: str,
    query_id: str,
    req: QueryRespondRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.APPLICANT, UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    check_application_ownership(app, current_user)

    query = db.query(ApplicationQuery).filter(
        ApplicationQuery.id == query_id,
        ApplicationQuery.application_id == app.id
    ).first()
    if not query:
        raise HTTPException(status_code=404, detail="Query not found.")

    query.applicant_response = req.applicant_response
    query.status = QueryStatus.RESPONDED
    query.responded_at = datetime.now(timezone.utc)

    # Check if there are other open queries; if not, and status is DOCUMENT_QUERY, we can transition back to UNDER_REVIEW
    open_queries = db.query(ApplicationQuery).filter(
        ApplicationQuery.application_id == app.id,
        ApplicationQuery.status == QueryStatus.OPEN,
        ApplicationQuery.id != query_id
    ).count()

    if open_queries == 0 and app.status == ApplicationStatus.DOCUMENT_QUERY:
        old_status = app.status
        app.status = ApplicationStatus.UNDER_REVIEW
        app.last_status_updated_at = datetime.now(timezone.utc)
        
        hist = ApplicationStatusHistory(
            application_id=app.id,
            old_status=old_status,
            new_status=ApplicationStatus.UNDER_REVIEW,
            changed_by=f"{current_user.name} (Applicant)",
            reason="Applicant responded to officer query and updated required documents.",
            visible_to_applicant=True
        )
        db.add(hist)

    # Notify officer
    if app.assigned_officer_id:
        notification_service.send(
            db,
            user_id=app.assigned_officer_id,
            title="Applicant Response Received",
            message=f"Applicant has responded to query '{query.subject}' on application {app.application_number}.",
            notification_type="INFO",
            link=f"/officer/applications/{app.application_number}"
        )

    audit_service.log(
        db,
        action="QUERY_RESPONDED",
        entity_type="QUERY",
        entity_id=query.id,
        user_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(query)

    return ApiResponse(
        success=True,
        data=QueryRead.model_validate(query),
        message="Response to query submitted successfully."
    )

@router.get("/applications/{app_id_or_number}/acknowledgement")
def download_acknowledgement(
    app_id_or_number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")
    
    check_application_ownership(app, current_user)
    
    pdf_bytes = pdf_service.generate_acknowledgement_pdf(app)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=FSSAI_Acknowledgement_{app.application_number}.pdf"
        }
    )

@router.get("/notifications", response_model=ApiResponse[List[NotificationRead]])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifs = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).limit(20).all()
    
    return ApiResponse(
        success=True,
        data=[NotificationRead.model_validate(n) for n in notifs],
        message="Notifications retrieved."
    )

@router.put("/notifications/{notification_id}/read", response_model=ApiResponse[dict])
def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
    return ApiResponse(success=True, data={"read": True}, message="Notification marked as read.")
