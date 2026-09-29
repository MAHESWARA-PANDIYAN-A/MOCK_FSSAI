from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models.enums import (
    UserRole, ApplicationType, ApplicationStatus, OwnershipType,
    BusinessType, OrganizationType, ProjectStage,
    ApplicabilityType, DocumentReviewStatus, RiskLevel
)
from app.models.models import (
    User, Applicant, Business, Application, ApplicationContact,
    ApplicationPremises, FoodProduct, FoodBusinessActivity,
    DocumentRequirement, Document, ApplicationStatusHistory,
    AuditLog
)

DOCUMENT_REQUIREMENTS_SEED = [
    {
        "id": "identity_proof",
        "name": "Identity Proof",
        "description": "Government-issued identity proof of the applicant.",
        "applicable_activity": "ALL",
        "applicability_type": ApplicabilityType.MANDATORY,
        "allowed_file_types": "pdf,jpg,jpeg,png",
        "max_file_size_mb": 5,
        "source_reference": "Government Issued Photo ID"
    },
    {
        "id": "address_proof",
        "name": "Address Proof",
        "description": "Proof of the applicant/business address.",
        "applicable_activity": "ALL",
        "applicability_type": ApplicabilityType.MANDATORY,
        "allowed_file_types": "pdf,jpg,jpeg,png",
        "max_file_size_mb": 5,
        "source_reference": "Registered Address Verification"
    },
    {
        "id": "passport_photo",
        "name": "Passport-size Photograph",
        "description": "Recent passport-size photograph of the applicant.",
        "applicable_activity": "ALL",
        "applicability_type": ApplicabilityType.MANDATORY,
        "allowed_file_types": "pdf,jpg,jpeg,png",
        "max_file_size_mb": 5,
        "source_reference": "Applicant Photograph"
    },
    {
        "id": "food_product_category",
        "name": "Food Product / Category Details",
        "description": "Document containing food product information and applicable food category details.",
        "applicable_activity": "ALL",
        "applicability_type": ApplicabilityType.MANDATORY,
        "allowed_file_types": "pdf,jpg,jpeg,png",
        "max_file_size_mb": 5,
        "source_reference": "Food Product Categorization"
    }
]

def seed_database(db: Session):
    valid_ids = {req["id"] for req in DOCUMENT_REQUIREMENTS_SEED}

    # 1. Clean up old/obsolete requirements from database
    obsolete_reqs = db.query(DocumentRequirement).filter(~DocumentRequirement.id.in_(valid_ids)).all()
    for o_req in obsolete_reqs:
        # Remove documents referencing obsolete requirement
        db.query(Document).filter(Document.requirement_id == o_req.id).delete(synchronize_session=False)
        db.delete(o_req)
    db.commit()

    # 2. Seed/Update exactly the 4 document requirements
    for req in DOCUMENT_REQUIREMENTS_SEED:
        existing = db.query(DocumentRequirement).filter(DocumentRequirement.id == req["id"]).first()
        if not existing:
            doc_req = DocumentRequirement(**req)
            db.add(doc_req)
        else:
            for k, v in req.items():
                setattr(existing, k, v)
    db.commit()

    # 3. Seed Users
    # Admin User
    admin_user = db.query(User).filter(User.email == "admin@fssai.gov.in").first()
    if not admin_user:
        admin_user = User(
            name="Admin Officer",
            email="admin@fssai.gov.in",
            mobile="9876543212",
            password_hash=get_password_hash("Admin123!"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

    # Officer User
    officer_user = db.query(User).filter(User.email == "officer.meena@fssai.gov.in").first()
    if not officer_user:
        officer_user = User(
            name="Officer Meena",
            email="officer.meena@fssai.gov.in",
            mobile="9876543211",
            password_hash=get_password_hash("Officer123!"),
            role=UserRole.OFFICER,
            is_active=True
        )
        db.add(officer_user)
        db.commit()
        db.refresh(officer_user)

    # Applicant User: Rahul Kumar
    applicant_user = db.query(User).filter(User.email == "rahul@example.com").first()
    if not applicant_user:
        applicant_user = User(
            name="Rahul Kumar",
            email="rahul@example.com",
            mobile="9876543210",
            password_hash=get_password_hash("Password123!"),
            role=UserRole.APPLICANT,
            is_active=True
        )
        db.add(applicant_user)
        db.commit()
        db.refresh(applicant_user)

    # Applicant Profile
    applicant_profile = db.query(Applicant).filter(Applicant.user_id == applicant_user.id).first()
    if not applicant_profile:
        applicant_profile = Applicant(
            user_id=applicant_user.id,
            applicant_name="Rahul Kumar",
            designation="Managing Director",
            mobile="9876543210",
            email="rahul@example.com"
        )
        db.add(applicant_profile)
        db.commit()
        db.refresh(applicant_profile)

    # 4. Seed Sample Business & Application if not exists
    sample_app = db.query(Application).filter(Application.application_number == "FSSAI-MOCK-2026-000101").first()
    if not sample_app:
        sample_biz = Business(
            applicant_id=applicant_profile.id,
            business_name="ABC Foods Pvt Ltd",
            legal_name="ABC Foods Private Limited",
            business_type="MANUFACTURING_UNIT",
            organization_type="PRIVATE_LIMITED",
            kind_of_food_business="Food Manufacturing / Processing",
            business_activity="Packaged Snack Manufacturing",
            project_stage="NEW",
            state="Tamil Nadu",
            district="Salem",
            pincode="636001",
            address_line_1="Plot 42, SIDCO Industrial Estate, Omalur Road",
            address_line_2="Phase II",
            landmark="Near Sub-Station",
            investment_amount=50000000.0,
            employee_count=45,
            gst_number="33AABCA1234F1Z5",
            pan_number="AABCA1234F",
            udyam_number="UDYAM-TN-24-0012345"
        )
        db.add(sample_biz)
        db.commit()
        db.refresh(sample_biz)

        sample_app = Application(
            application_number="FSSAI-MOCK-2026-000101",
            external_reference_id="SIH-SEED-1001",
            source_system="SIH26130",
            application_type=ApplicationType.NEW_LICENSE,
            business_id=sample_biz.id,
            applicant_id=applicant_profile.id,
            status=ApplicationStatus.SUBMITTED,
            submission_date=datetime.now(timezone.utc),
            last_status_updated_at=datetime.now(timezone.utc),
            assigned_officer_id=officer_user.id,
            risk_level=RiskLevel.LOW,
            installed_capacity_details="5000 kg/day automatic continuous frying & nitrogen packing line",
            machinery_details="High-speed slicer, de-oiling centrifuge, flavoring drum, multi-head weigher, nitrogen packaging unit"
        )
        db.add(sample_app)
        db.commit()
        db.refresh(sample_app)

        # Contacts
        contact = ApplicationContact(
            application_id=sample_app.id,
            mobile="9876543210",
            email="rahul@example.com",
            mobile_verified=True,
            email_verified=True
        )
        db.add(contact)

        # Premises
        prem = ApplicationPremises(
            application_id=sample_app.id,
            ownership_type=OwnershipType.OWNED,
            address_line_1="Plot 42, SIDCO Industrial Estate, Omalur Road",
            address_line_2="Phase II",
            state="Tamil Nadu",
            district="Salem",
            pincode="636001",
            landmark="Near Sub-Station",
            latitude=11.6643,
            longitude=78.1460
        )
        db.add(prem)

        # Activities
        act1 = FoodBusinessActivity(application_id=sample_app.id, activity_type="MANUFACTURING")
        act2 = FoodBusinessActivity(application_id=sample_app.id, activity_type="PROCESSING")
        act3 = FoodBusinessActivity(application_id=sample_app.id, activity_type="PACKAGING")
        db.add_all([act1, act2, act3])

        # Food Products
        p1 = FoodProduct(
            application_id=sample_app.id,
            product_name="Masala Potato Chips",
            product_category="Packaged Snack Foods",
            description="Crispy spiced potato chips packaged in nitrogen-flushed pouches.",
            ingredients="Fresh Potatoes, Edible Vegetable Oil (Palmolein/Sunflower), Spices & Condiments, Iodized Salt",
            manufacturing_process_description="Washing -> Slicing -> Blanching -> Continuous Frying -> Seasoning -> Nitrogen Packing",
            expected_capacity=3000.0,
            unit_of_measure="kg/day"
        )
        p2 = FoodProduct(
            application_id=sample_app.id,
            product_name="Crispy Banana Wafers",
            product_category="Packaged Snack Foods",
            description="Salted crispy raw banana wafers.",
            ingredients="Raw Bananas (Nendran), Pure Coconut Oil, Rock Salt",
            manufacturing_process_description="Peeling -> Slicing -> Deep Frying -> Salting -> Automated Packaging",
            expected_capacity=2000.0,
            unit_of_measure="kg/day"
        )
        db.add_all([p1, p2])

        # Status History
        h1 = ApplicationStatusHistory(
            application_id=sample_app.id,
            old_status=ApplicationStatus.DRAFT,
            new_status=ApplicationStatus.SUBMITTED,
            changed_by="Rahul Kumar (Applicant)",
            reason="Application submitted with verified OTP and initial document upload.",
            visible_to_applicant=True
        )
        db.add(h1)

        # Audit Log
        AuditLog(
            user_id=applicant_user.id,
            action="APPLICATION_SUBMITTED",
            entity_type="APPLICATION",
            entity_id=sample_app.id,
            metadata_json={"application_number": sample_app.application_number}
        )

        db.commit()
