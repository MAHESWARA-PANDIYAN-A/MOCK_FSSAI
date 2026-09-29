import random
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.models import (
    Application, Applicant, Business, ApplicationContact,
    ApplicationPremises, FoodProduct, FoodBusinessActivity,
    Document, DocumentRequirement, ApplicationStatusHistory,
    Notification
)
from app.models.enums import (
    ApplicationStatus, ApplicationType, ApplicabilityType,
    DocumentReviewStatus, RiskLevel
)
from app.schemas.application import (
    ApplicationRead, ApplicantInfo, BusinessInfo,
    PremisesInfo, FoodProductInfo
)
from app.schemas.document import DocumentRead
from app.schemas.query_inspection import QueryRead, InspectionRead, StatusHistoryRead
from app.services.risk_engine import risk_engine

EXACT_REQUIRED_DOCUMENT_IDS = [
    "identity_proof",
    "address_proof",
    "passport_photo",
    "food_product_category"
]

class ApplicationService:
    @staticmethod
    def generate_application_number(db: Session) -> str:
        year = datetime.now().year
        for _ in range(10):
            num = random.randint(100000, 999999)
            app_no = f"FSSAI-MOCK-{year}-{num}"
            existing = db.query(Application).filter(Application.application_number == app_no).first()
            if not existing:
                return app_no
        return f"FSSAI-MOCK-{year}-{int(datetime.now().timestamp())}"

    @staticmethod
    def format_application_read(app: Application, db: Session) -> ApplicationRead:
        # Check applicant
        app_info = None
        if app.applicant:
            app_info = ApplicantInfo(
                applicant_name=app.applicant.applicant_name,
                designation=app.applicant.designation or "Authorized Signatory",
                mobile=app.applicant.mobile,
                email=app.applicant.email
            )

        # Check business
        biz_info = None
        if app.business:
            biz_info = BusinessInfo(
                business_name=app.business.business_name,
                legal_name=app.business.legal_name,
                organization_type=app.business.organization_type or "PRIVATE_LIMITED",
                business_type=app.business.business_type or "MANUFACTURING_UNIT",
                kind_of_food_business=app.business.kind_of_food_business,
                business_activity=app.business.business_activity,
                project_stage=app.business.project_stage or "NEW",
                state=app.business.state,
                district=app.business.district,
                pincode=app.business.pincode,
                address_line_1=app.business.address_line_1,
                address_line_2=app.business.address_line_2,
                landmark=app.business.landmark,
                investment_amount=app.business.investment_amount,
                employee_count=app.business.employee_count,
                gst_number=app.business.gst_number,
                pan_number=app.business.pan_number,
                udyam_number=app.business.udyam_number
            )

        # Premises
        prem_info = None
        if app.premises:
            prem_info = PremisesInfo(
                ownership_type=app.premises.ownership_type,
                address_line_1=app.premises.address_line_1,
                address_line_2=app.premises.address_line_2,
                state=app.premises.state,
                district=app.premises.district,
                pincode=app.premises.pincode,
                landmark=app.premises.landmark,
                latitude=app.premises.latitude,
                longitude=app.premises.longitude
            )

        # Activities
        activities = [a.activity_type for a in (app.activities or [])]

        # Products
        products = [
            FoodProductInfo(
                id=p.id,
                product_name=p.product_name,
                product_category=p.product_category,
                description=p.description,
                ingredients=p.ingredients,
                manufacturing_process_description=p.manufacturing_process_description,
                expected_capacity=p.expected_capacity,
                unit_of_measure=p.unit_of_measure
            ) for p in (app.products or [])
        ]

        # Documents
        documents = []
        uploaded_req_ids = set()
        for doc in (app.documents or []):
            req_name = doc.requirement.name if doc.requirement else doc.requirement_id
            documents.append(DocumentRead(
                id=doc.id,
                application_id=doc.application_id,
                requirement_id=doc.requirement_id,
                requirement_name=req_name,
                original_filename=doc.original_filename,
                file_path=doc.file_path,
                mime_type=doc.mime_type,
                file_size=doc.file_size,
                upload_status=doc.upload_status,
                review_status=doc.review_status,
                officer_comment=doc.officer_comment,
                uploaded_at=doc.uploaded_at,
                reviewed_at=doc.reviewed_at
            ))
            if doc.review_status != DocumentReviewStatus.REJECTED:
                uploaded_req_ids.add(doc.requirement_id)

        # Queries
        queries = [
            QueryRead(
                id=q.id,
                application_id=q.application_id,
                officer_id=q.officer_id,
                officer_name=q.officer.name if q.officer else "Assigned Officer",
                subject=q.subject,
                message=q.message,
                applicant_response=q.applicant_response,
                status=q.status,
                deadline_date=q.deadline_date,
                created_at=q.created_at,
                responded_at=q.responded_at
            ) for q in (app.queries or [])
        ]

        # Inspections
        inspections = [
            InspectionRead(
                id=i.id,
                application_id=i.application_id,
                officer_id=i.officer_id,
                officer_name=i.officer.name if i.officer else "Inspecting Officer",
                inspection_type=i.inspection_type,
                scheduled_date=i.scheduled_date,
                scheduled_time=i.scheduled_time,
                location=i.location,
                instructions=i.instructions,
                status=i.status,
                officer_notes=i.officer_notes,
                completed_at=i.completed_at,
                created_at=i.created_at
            ) for i in (app.inspections or [])
        ]

        # Status History
        status_hist = [
            StatusHistoryRead(
                id=h.id,
                application_id=h.application_id,
                old_status=h.old_status,
                new_status=h.new_status,
                changed_by=h.changed_by,
                reason=h.reason,
                visible_to_applicant=h.visible_to_applicant,
                created_at=h.created_at
            ) for h in (app.status_history or [])
        ]

        # Missing mandatory fields validation
        missing_fields = []
        if not app_info or not app_info.applicant_name or not app_info.mobile or not app_info.email:
            missing_fields.append("Applicant Details")
        if not biz_info or not biz_info.business_name or not biz_info.state or not biz_info.district or not biz_info.pincode or not biz_info.address_line_1:
            missing_fields.append("Business Premises & Address Details")
        if not activities:
            missing_fields.append("Food Business Activities")
        if not products:
            missing_fields.append("Food Products")

        # Missing mandatory documents calculation (exactly the 4 FSSAI documents)
        req_name_map = {
            "identity_proof": "Identity Proof",
            "address_proof": "Address Proof",
            "passport_photo": "Passport-size Photograph",
            "food_product_category": "Food Product / Category Details"
        }
        
        missing_docs = []
        for req_id in EXACT_REQUIRED_DOCUMENT_IDS:
            if req_id not in uploaded_req_ids:
                missing_docs.append(req_name_map.get(req_id, req_id))

        is_mob_ver = bool(app.contacts and app.contacts.mobile_verified)
        is_em_ver = bool(app.contacts and app.contacts.email_verified)

        return ApplicationRead(
            id=app.id,
            application_number=app.application_number,
            external_reference_id=app.external_reference_id,
            source_system=app.source_system,
            application_type=app.application_type,
            status=app.status,
            submission_date=app.submission_date,
            last_status_updated_at=app.last_status_updated_at,
            assigned_officer_id=app.assigned_officer_id,
            assigned_officer_name=app.assigned_officer.name if app.assigned_officer else None,
            risk_level=app.risk_level or risk_engine.calculate_priority(app),
            installed_capacity_details=app.installed_capacity_details,
            machinery_details=app.machinery_details,
            created_at=app.created_at,
            updated_at=app.updated_at,
            applicant=app_info,
            business=biz_info,
            premises=prem_info,
            activities=activities,
            products=products,
            documents=documents,
            queries=queries,
            inspections=inspections,
            status_history=status_hist,
            is_applicant_verified=is_mob_ver and is_em_ver,
            is_mobile_verified=is_mob_ver,
            is_email_verified=is_em_ver,
            missing_mandatory_fields=missing_fields,
            missing_mandatory_documents=missing_docs
        )

application_service = ApplicationService()
