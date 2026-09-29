import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Index, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enums import (
    UserRole, ApplicationType, ApplicationStatus, OwnershipType,
    BusinessType, OrganizationType, ProjectStage, ActivityType,
    ApplicabilityType, DocumentReviewStatus, QueryStatus,
    InspectionStatus, RiskLevel
)

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    mobile = Column(String(20), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.APPLICANT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    applicant_profile = relationship("Applicant", back_populates="user", uselist=False, cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Applicant(Base):
    __tablename__ = "applicants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    applicant_name = Column(String(255), nullable=False)
    designation = Column(String(100), default="Authorized Signatory")
    mobile = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    user = relationship("User", back_populates="applicant_profile")
    businesses = relationship("Business", back_populates="applicant", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="applicant", cascade="all, delete-orphan")

class Business(Base):
    __tablename__ = "businesses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    applicant_id = Column(String(36), ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False)
    business_name = Column(String(255), nullable=False, index=True)
    legal_name = Column(String(255), nullable=True)
    business_type = Column(String(100), default=BusinessType.MANUFACTURING_UNIT.value)
    organization_type = Column(String(100), default=OrganizationType.PRIVATE_LIMITED.value)
    kind_of_food_business = Column(String(255), default="Food Manufacturing / Processing")
    business_activity = Column(String(255), default="Food Processing Unit")
    project_stage = Column(String(50), default=ProjectStage.NEW.value)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)
    address_line_1 = Column(String(255), nullable=False)
    address_line_2 = Column(String(255), nullable=True)
    landmark = Column(String(255), nullable=True)
    investment_amount = Column(Float, default=0.0)
    employee_count = Column(Integer, default=0)
    gst_number = Column(String(50), nullable=True)
    pan_number = Column(String(50), nullable=True)
    udyam_number = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    applicant = relationship("Applicant", back_populates="businesses")
    applications = relationship("Application", back_populates="business", cascade="all, delete-orphan")

class Application(Base):
    __tablename__ = "applications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_number = Column(String(50), unique=True, index=True, nullable=False)
    external_reference_id = Column(String(100), index=True, nullable=True)
    source_system = Column(String(100), default="PORTAL", nullable=False)
    application_type = Column(SQLEnum(ApplicationType), default=ApplicationType.NEW_LICENSE, nullable=False)
    business_id = Column(String(36), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False)
    applicant_id = Column(String(36), ForeignKey("applicants.id", ondelete="CASCADE"), nullable=False)
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.DRAFT, nullable=False, index=True)
    submission_date = Column(DateTime, nullable=True)
    last_status_updated_at = Column(DateTime, default=utc_now, nullable=False)
    assigned_officer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.LOW, nullable=False)
    installed_capacity_details = Column(Text, nullable=True)
    machinery_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    business = relationship("Business", back_populates="applications")
    applicant = relationship("Applicant", back_populates="applications")
    assigned_officer = relationship("User", foreign_keys=[assigned_officer_id])
    contacts = relationship("ApplicationContact", back_populates="application", uselist=False, cascade="all, delete-orphan")
    premises = relationship("ApplicationPremises", back_populates="application", uselist=False, cascade="all, delete-orphan")
    products = relationship("FoodProduct", back_populates="application", cascade="all, delete-orphan")
    activities = relationship("FoodBusinessActivity", back_populates="application", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="application", cascade="all, delete-orphan")
    queries = relationship("ApplicationQuery", back_populates="application", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="application", cascade="all, delete-orphan")
    status_history = relationship("ApplicationStatusHistory", back_populates="application", cascade="all, delete-orphan", order_by="desc(ApplicationStatusHistory.created_at)")

class ApplicationContact(Base):
    __tablename__ = "application_contacts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)
    mobile = Column(String(20), nullable=False)
    email = Column(String(255), nullable=False)
    mobile_verified = Column(Boolean, default=False, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    otp_code = Column(String(10), nullable=True)
    otp_attempt_count = Column(Integer, default=0)
    otp_expires_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="contacts")

class ApplicationPremises(Base):
    __tablename__ = "application_premises"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, unique=True)
    ownership_type = Column(SQLEnum(OwnershipType), default=OwnershipType.OWNED, nullable=False)
    address_line_1 = Column(String(255), nullable=False)
    address_line_2 = Column(String(255), nullable=True)
    state = Column(String(100), nullable=False)
    district = Column(String(100), nullable=False)
    pincode = Column(String(20), nullable=False)
    landmark = Column(String(255), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    application = relationship("Application", back_populates="premises")

class FoodProduct(Base):
    __tablename__ = "food_products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    product_name = Column(String(255), nullable=False)
    product_category = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    ingredients = Column(Text, nullable=True)
    manufacturing_process_description = Column(Text, nullable=True)
    expected_capacity = Column(Float, default=0.0)
    unit_of_measure = Column(String(50), default="kg/day")

    application = relationship("Application", back_populates="products")

class FoodBusinessActivity(Base):
    __tablename__ = "food_business_activities"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(100), nullable=False)

    application = relationship("Application", back_populates="activities")

class DocumentRequirement(Base):
    __tablename__ = "document_requirements"

    id = Column(String(50), primary_key=True)  # e.g., "identity_proof", "address_proof", "passport_photo", "food_product_category"
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    applicable_activity = Column(String(100), nullable=True)  # "ALL", "MANUFACTURING", etc.
    applicability_type = Column(SQLEnum(ApplicabilityType), default=ApplicabilityType.MANDATORY, nullable=False)
    allowed_file_types = Column(String(255), default="pdf,jpg,jpeg,png")
    max_file_size_mb = Column(Integer, default=5)
    source_reference = Column(String(255), default="FSSAI Schedule 2 Regulations")
    is_active = Column(Boolean, default=True, nullable=False)

    documents = relationship("Document", back_populates="requirement")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(String(50), ForeignKey("document_requirements.id", ondelete="RESTRICT"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_size = Column(Integer, nullable=False)
    upload_status = Column(String(50), default="UPLOADED")
    review_status = Column(SQLEnum(DocumentReviewStatus), default=DocumentReviewStatus.PENDING_REVIEW, nullable=False)
    officer_comment = Column(Text, nullable=True)
    uploaded_at = Column(DateTime, default=utc_now, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="documents")
    requirement = relationship("DocumentRequirement", back_populates="documents")

class ApplicationQuery(Base):
    __tablename__ = "application_queries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    applicant_response = Column(Text, nullable=True)
    status = Column(SQLEnum(QueryStatus), default=QueryStatus.OPEN, nullable=False)
    deadline_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    responded_at = Column(DateTime, nullable=True)

    application = relationship("Application", back_populates="queries")
    officer = relationship("User", foreign_keys=[officer_id])

class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    officer_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    inspection_type = Column(String(100), default="Pre-Licensing Premises & Hygiene Inspection")
    scheduled_date = Column(String(50), nullable=False)  # YYYY-MM-DD
    scheduled_time = Column(String(50), nullable=False)  # HH:MM AM/PM
    location = Column(String(500), nullable=False)
    instructions = Column(Text, nullable=True)
    status = Column(SQLEnum(InspectionStatus), default=InspectionStatus.SCHEDULED, nullable=False)
    officer_notes = Column(Text, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    application = relationship("Application", back_populates="inspections")
    officer = relationship("User", foreign_keys=[officer_id])

class ApplicationStatusHistory(Base):
    __tablename__ = "application_status_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    application_id = Column(String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False)
    old_status = Column(SQLEnum(ApplicationStatus), nullable=True)
    new_status = Column(SQLEnum(ApplicationStatus), nullable=False)
    changed_by = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)
    visible_to_applicant = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    application = relationship("Application", back_populates="status_history")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(100), nullable=False)
    entity_id = Column(String(100), nullable=True)
    metadata_json = Column(JSON, nullable=True)
    ip_address = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="audit_logs")

class IntegrationRequest(Base):
    __tablename__ = "integration_requests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    source_system = Column(String(100), nullable=False)
    endpoint = Column(String(255), nullable=False)
    external_reference_id = Column(String(100), nullable=True, index=True)
    request_id = Column(String(100), nullable=True)
    idempotency_key = Column(String(100), nullable=True, index=True)
    status = Column(String(50), nullable=False)
    response_code = Column(Integer, nullable=False)
    processing_time_ms = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="INFO")  # INFO, WARNING, SUCCESS, DANGER
    is_read = Column(Boolean, default=False, nullable=False)
    link = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    user = relationship("User", back_populates="notifications")
