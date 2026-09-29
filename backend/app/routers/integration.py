import time
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import verify_integration_api_key
from app.models.models import (
    User, Applicant, Business, Application, ApplicationContact,
    ApplicationPremises, FoodProduct, FoodBusinessActivity,
    Document, DocumentRequirement, IntegrationRequest, ApplicationStatusHistory,
    Notification
)
from app.models.enums import (
    UserRole, ApplicationStatus, ApplicationType, OwnershipType,
    RiskLevel, DocumentReviewStatus
)
from app.schemas.integration import (
    IntegrationPrefillRequest, IntegrationPrefillResponse,
    IntegrationStatusResponse, IntegrationStatusPendingAction,
    IntegrationSubmitResponse, IntegrationInspectionDetail,
    IntegrationApprovalDetail, IntegrationDocumentSummary,
    IntegrationQuerySummary
)
from app.schemas.application import ApplicationRead
from app.schemas.document import DocumentUploadResponse
from app.schemas.common import ApiResponse
from app.services.application_service import application_service
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service
from app.services.webhook_service import webhook_service
from app.services.risk_engine import risk_engine
from app.core.security import get_password_hash

router = APIRouter(prefix="/integrations/v1", tags=["Main SIH Portal Integration API (MOCK)"])

@router.post("/applications/prefill", response_model=ApiResponse[IntegrationPrefillResponse])
def prefill_application(
    req: IntegrationPrefillRequest,
    request: Request,
    api_key: str = Depends(verify_integration_api_key),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db)
):
    start_time = time.time()

    # Check for existing application with same external_reference_id
    existing_app = db.query(Application).filter(
        Application.external_reference_id == req.external_reference_id
    ).first()

    if existing_app:
        formatted_existing = application_service.format_application_read(existing_app, db)
        prefill_resp = IntegrationPrefillResponse(
            success=True,
            application_id=existing_app.id,
            application_number=existing_app.application_number,
            external_reference_id=existing_app.external_reference_id,
            status=existing_app.status,
            prefilled_fields=18,
            missing_fields=formatted_existing.missing_mandatory_documents,
            message="Existing application found for external reference ID. Returned successfully."
        )

        # Log integration request
        log_req = IntegrationRequest(
            source_system=req.source_system,
            endpoint="/api/integrations/v1/applications/prefill",
            external_reference_id=req.external_reference_id,
            idempotency_key=idempotency_key,
            status="SUCCESS_EXISTING",
            response_code=200,
            processing_time_ms=(time.time() - start_time) * 1000
        )
        db.add(log_req)
        db.commit()

        return ApiResponse(success=True, data=prefill_resp, message="Existing application returned.")

    # 1. Find or create applicant user
    applicant_email = req.applicant.email.lower().strip()
    user = db.query(User).filter(
        (User.email == applicant_email) | (User.mobile == req.applicant.mobile.strip())
    ).first()

    if not user:
        user = User(
            name=req.applicant.applicant_name,
            email=applicant_email,
            mobile=req.applicant.mobile.strip(),
            password_hash=get_password_hash("Password123!"),
            role=UserRole.APPLICANT,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    applicant = db.query(Applicant).filter(Applicant.user_id == user.id).first()
    if not applicant:
        applicant = Applicant(
            user_id=user.id,
            applicant_name=req.applicant.applicant_name,
            designation=req.applicant.designation or "Authorized Signatory",
            mobile=req.applicant.mobile.strip(),
            email=applicant_email
        )
        db.add(applicant)
        db.commit()
        db.refresh(applicant)

    # 2. Create Business
    biz = Business(
        applicant_id=applicant.id,
        business_name=req.business.business_name,
        legal_name=req.business.legal_name or req.business.business_name,
        business_type=req.business.business_type,
        organization_type=req.business.organization_type,
        kind_of_food_business=req.business.kind_of_food_business or "Food Manufacturing / Processing",
        business_activity=req.business.business_activity or "Packaged Snack Manufacturing",
        project_stage=req.business.project_stage,
        state=req.business.state,
        district=req.business.district,
        pincode=req.business.pincode,
        address_line_1=req.business.address_line_1,
        address_line_2=req.business.address_line_2,
        landmark=req.business.landmark,
        investment_amount=req.business.investment_amount or 0.0,
        employee_count=req.business.employee_count or 0,
        gst_number=req.business.gst_number,
        pan_number=req.business.pan_number,
        udyam_number=req.business.udyam_number
    )
    db.add(biz)
    db.commit()
    db.refresh(biz)

    # 3. Create Application
    app_no = application_service.generate_application_number(db)
    new_app = Application(
        application_number=app_no,
        external_reference_id=req.external_reference_id,
        source_system=req.source_system,
        application_type=ApplicationType.NEW_LICENSE,
        business_id=biz.id,
        applicant_id=applicant.id,
        status=ApplicationStatus.DRAFT,
        last_status_updated_at=datetime.now(timezone.utc),
        installed_capacity_details=req.installed_capacity_details,
        machinery_details=req.machinery_details,
        risk_level=RiskLevel.LOW
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    # 4. Create Contact
    contact = ApplicationContact(
        application_id=new_app.id,
        mobile=req.applicant.mobile.strip(),
        email=applicant_email,
        mobile_verified=True,  # Verified through main SIH portal
        email_verified=True
    )
    db.add(contact)

    # 5. Create Premises
    if req.premises:
        prem = ApplicationPremises(
            application_id=new_app.id,
            ownership_type=req.premises.ownership_type,
            address_line_1=req.premises.address_line_1,
            address_line_2=req.premises.address_line_2,
            state=req.premises.state,
            district=req.premises.district,
            pincode=req.premises.pincode,
            landmark=req.premises.landmark,
            latitude=req.premises.latitude,
            longitude=req.premises.longitude
        )
    else:
        prem = ApplicationPremises(
            application_id=new_app.id,
            ownership_type=OwnershipType.OWNED,
            address_line_1=req.business.address_line_1,
            address_line_2=req.business.address_line_2,
            state=req.business.state,
            district=req.business.district,
            pincode=req.business.pincode,
            landmark=req.business.landmark
        )
    db.add(prem)

    # 6. Create Activities
    activities = req.activities or ["MANUFACTURING", "PROCESSING"]
    for act in activities:
        db.add(FoodBusinessActivity(application_id=new_app.id, activity_type=act))

    # 7. Create Products
    if req.products:
        for p in req.products:
            prod = FoodProduct(
                application_id=new_app.id,
                product_name=p.product_name,
                product_category=p.product_category,
                description=p.description,
                ingredients=p.ingredients,
                manufacturing_process_description=p.manufacturing_process_description,
                expected_capacity=p.expected_capacity,
                unit_of_measure=p.unit_of_measure
            )
            db.add(prod)

    # 8. Status History
    status_hist = ApplicationStatusHistory(
        application_id=new_app.id,
        old_status=None,
        new_status=ApplicationStatus.DRAFT,
        changed_by=f"Integration API ({req.source_system})",
        reason=f"Application pre-filled from {req.source_system} with Ref {req.external_reference_id}",
        visible_to_applicant=True
    )
    db.add(status_hist)

    new_app.risk_level = risk_engine.calculate_priority(new_app)

    # 9. Audit Log & Integration Log
    audit_service.log(
        db,
        action="APPLICATION_PREFILLED",
        entity_type="APPLICATION",
        entity_id=new_app.id,
        user_id=user.id,
        metadata={"source_system": req.source_system, "external_reference_id": req.external_reference_id},
        ip_address=request.client.host if request.client else None
    )

    log_req = IntegrationRequest(
        source_system=req.source_system,
        endpoint="/api/integrations/v1/applications/prefill",
        external_reference_id=req.external_reference_id,
        idempotency_key=idempotency_key,
        status="SUCCESS_CREATED",
        response_code=201,
        processing_time_ms=(time.time() - start_time) * 1000
    )
    db.add(log_req)
    db.commit()
    db.refresh(new_app)

    formatted_app = application_service.format_application_read(new_app, db)

    resp = IntegrationPrefillResponse(
        success=True,
        application_id=new_app.id,
        application_number=new_app.application_number,
        external_reference_id=new_app.external_reference_id,
        status=new_app.status,
        prefilled_fields=20,
        missing_fields=formatted_app.missing_mandatory_documents,
        message="Draft application created and pre-filled from Main SIH Portal."
    )

    return ApiResponse(
        success=True,
        data=resp,
        message="Application pre-filled successfully."
    )

@router.post("/applications/{app_id_or_number}/documents", response_model=ApiResponse[DocumentUploadResponse])
async def upload_prefill_document(
    app_id_or_number: str,
    request: Request,
    requirement_id: str = Form(...),
    file: UploadFile = File(...),
    api_key: str = Depends(verify_integration_api_key),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    doc_req = db.query(DocumentRequirement).filter(DocumentRequirement.id == requirement_id).first()
    if not doc_req:
        raise HTTPException(status_code=404, detail=f"Document requirement '{requirement_id}' not found.")

    orig_name, stored_name, file_size, file_path = await storage_service.save_file(file, app.application_number)

    existing_doc = db.query(Document).filter(
        Document.application_id == app.id,
        Document.requirement_id == requirement_id
    ).first()

    if existing_doc:
        existing_doc.original_filename = orig_name
        existing_doc.stored_filename = stored_name
        existing_doc.file_path = file_path
        existing_doc.file_size = file_size
        existing_doc.mime_type = file.content_type or "application/octet-stream"
        existing_doc.review_status = DocumentReviewStatus.PENDING_REVIEW
        existing_doc.uploaded_at = datetime.now(timezone.utc)
        doc_record = existing_doc
    else:
        doc_record = Document(
            application_id=app.id,
            requirement_id=requirement_id,
            original_filename=orig_name,
            stored_filename=stored_name,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            review_status=DocumentReviewStatus.PENDING_REVIEW
        )
        db.add(doc_record)

    audit_service.log(
        db,
        action="INTEGRATION_DOCUMENT_UPLOADED",
        entity_type="DOCUMENT",
        entity_id=app.id,
        metadata={"requirement_id": requirement_id, "filename": orig_name},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(doc_record)

    return ApiResponse(
        success=True,
        data=DocumentUploadResponse(
            id=doc_record.id,
            application_id=doc_record.application_id,
            requirement_id=doc_record.requirement_id,
            original_filename=doc_record.original_filename,
            file_size=doc_record.file_size,
            review_status=doc_record.review_status,
            uploaded_at=doc_record.uploaded_at
        ),
        message="Document uploaded through Integration API."
    )

@router.get("/applications/{application_number}", response_model=ApiResponse[ApplicationRead])
def get_application_by_integration(
    application_number: str,
    api_key: str = Depends(verify_integration_api_key),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.application_number == application_number, Application.external_reference_id == application_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    return ApiResponse(
        success=True,
        data=application_service.format_application_read(app, db),
        message="Application details retrieved for integration."
    )

@router.get("/applications/{application_number}/status", response_model=ApiResponse[IntegrationStatusResponse])
def get_application_status_sync(
    application_number: str,
    api_key: str = Depends(verify_integration_api_key),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.application_number == application_number, Application.external_reference_id == application_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    pending_actions = []
    
    # Check open queries
    open_queries = [q for q in (app.queries or []) if q.status.value == "OPEN"]
    for q in open_queries:
        pending_actions.append(IntegrationStatusPendingAction(
            type="QUERY",
            message=f"Respond to officer query: {q.subject}"
        ))

    # Check rejected documents
    rejected_docs = [
        d for d in (app.documents or [])
        if d.review_status in (DocumentReviewStatus.REJECTED, DocumentReviewStatus.NEEDS_CORRECTION)
    ]
    for d in rejected_docs:
        pending_actions.append(IntegrationStatusPendingAction(
            type="DOCUMENT",
            message=f"Re-upload {d.requirement.name if d.requirement else d.requirement_id}: {d.officer_comment or 'Correction required'}"
        ))

    # Check inspection
    scheduled_inspections = [i for i in (app.inspections or []) if i.status.value == "SCHEDULED"]
    if scheduled_inspections:
        ins = scheduled_inspections[0]
        pending_actions.append(IntegrationStatusPendingAction(
            type="INSPECTION",
            message=f"Inspection scheduled on {ins.scheduled_date} at {ins.scheduled_time} at {ins.location}"
        ))

    # Documents summary
    reqs = db.query(DocumentRequirement).filter(DocumentRequirement.is_active == True).all()
    docs_by_req = {d.requirement_id: d for d in (app.documents or [])}
    documents_summary = []
    for r in reqs:
        d = docs_by_req.get(r.id)
        doc_status = "NOT_UPLOADED"
        if d:
            doc_status = "UPLOADED" if d.review_status == DocumentReviewStatus.PENDING_REVIEW else d.review_status.value

        documents_summary.append(IntegrationDocumentSummary(
            requirement_id=r.id,
            name=r.name,
            status=doc_status,
            review_status=d.review_status.value if d else "NOT_UPLOADED",
            original_filename=d.original_filename if d else None,
            file_size=d.file_size if d else None,
            officer_comment=d.officer_comment if d else None,
            uploaded_at=d.uploaded_at.isoformat() if d else None
        ))

    # Inspection details
    latest_inspection = None
    if app.inspections and len(app.inspections) > 0:
        insp = sorted(app.inspections, key=lambda x: x.created_at, reverse=True)[0]
        latest_inspection = IntegrationInspectionDetail(
            id=insp.id,
            inspection_type=insp.inspection_type,
            scheduled_date=insp.scheduled_date,
            scheduled_time=insp.scheduled_time,
            location=insp.location,
            instructions=insp.instructions,
            status=insp.status.value,
            officer_name=insp.officer.name if insp.officer else (app.assigned_officer.name if app.assigned_officer else "Officer Meena K"),
            completed_at=insp.completed_at.isoformat() if insp.completed_at else None,
            officer_notes=insp.officer_notes
        )

    # Approval details
    approval_details = None
    if app.status == ApplicationStatus.APPROVED:
        approval_date = app.last_status_updated_at or app.updated_at
        try:
            valid_until = approval_date.replace(year=approval_date.year + 5).isoformat()
        except Exception:
            valid_until = None

        approval_details = IntegrationApprovalDetail(
            is_approved=True,
            license_number=f"10026011{abs(hash(app.application_number)) % 1000000:06d}",
            approval_date=approval_date.isoformat() if approval_date else None,
            valid_until=valid_until,
            acknowledgement_pdf_url=f"/api/v1/applicant/applications/{app.application_number}/acknowledgement",
            qr_verification_code=f"FSSAI-VERIFIED-{app.application_number}"
        )

    # Queries summary
    queries_summary = [
        IntegrationQuerySummary(
            id=q.id,
            subject=q.subject,
            message=q.message,
            applicant_response=q.applicant_response,
            status=q.status.value,
            deadline_date=q.deadline_date.isoformat() if q.deadline_date else None,
            created_at=q.created_at.isoformat()
        )
        for q in (app.queries or [])
    ]

    # Timeline summary and last remark
    last_remark = None
    if app.status_history and len(app.status_history) > 0:
        last_remark = app.status_history[0].reason

    timeline_summary = [
        {
            "old_status": h.old_status.value if h.old_status else None,
            "new_status": h.new_status.value,
            "changed_by": h.changed_by,
            "reason": h.reason,
            "created_at": h.created_at.isoformat()
        }
        for h in (app.status_history or [])
    ]

    return ApiResponse(
        success=True,
        data=IntegrationStatusResponse(
            application_number=app.application_number,
            external_reference_id=app.external_reference_id,
            status=app.status,
            last_updated_at=app.last_status_updated_at,
            pending_actions=pending_actions,
            officer_remarks=last_remark,
            assigned_officer_name=app.assigned_officer.name if app.assigned_officer else "Officer Meena K",
            queries_count=len(open_queries),
            inspection_scheduled=len(scheduled_inspections) > 0,
            approval_details=approval_details,
            inspection_details=latest_inspection,
            documents=documents_summary,
            queries=queries_summary,
            timeline=timeline_summary
        ),
        message="Status sync details retrieved."
    )

@router.post("/applications/{application_number}/submit", response_model=ApiResponse[IntegrationSubmitResponse])
async def submit_application_by_integration(
    application_number: str,
    request: Request,
    api_key: str = Depends(verify_integration_api_key),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.application_number == application_number, Application.external_reference_id == application_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

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
                "message": "All 4 required documents must be uploaded before submission.",
                "missing_documents": formatted_app.missing_mandatory_documents
            }
        )

    old_status = app.status
    app.status = ApplicationStatus.SUBMITTED
    app.submission_date = datetime.now(timezone.utc)
    app.last_status_updated_at = datetime.now(timezone.utc)
    app.risk_level = risk_engine.calculate_priority(app)

    # Assign to officer Meena
    officer = db.query(User).filter(User.email == "officer.meena@fssai.gov.in").first()
    if officer:
        app.assigned_officer_id = officer.id

    db.add(ApplicationStatusHistory(
        application_id=app.id,
        old_status=old_status,
        new_status=ApplicationStatus.SUBMITTED,
        changed_by=f"Integration API ({app.source_system})",
        reason="Application submitted automatically through external API integration.",
        visible_to_applicant=True
    ))

    audit_service.log(
        db,
        action="INTEGRATION_SUBMITTED",
        entity_type="APPLICATION",
        entity_id=app.id,
        metadata={"application_number": app.application_number},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(app)

    # Webhook
    await webhook_service.dispatch_event(
        event_name="APPLICATION_SUBMITTED",
        application_number=app.application_number,
        external_reference_id=app.external_reference_id,
        old_status=old_status.value,
        new_status=app.status.value,
        metadata={"source": "INTEGRATION_API"}
    )

    return ApiResponse(
        success=True,
        data=IntegrationSubmitResponse(
            success=True,
            application_number=app.application_number,
            status=app.status,
            message="Application submitted successfully via Integration API."
        ),
        message="Application submitted."
    )
