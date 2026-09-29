from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.enums import (
    ApplicationType, ApplicationStatus, OwnershipType,
    RiskLevel
)
from app.schemas.document import DocumentRead
from app.schemas.query_inspection import QueryRead, InspectionRead, StatusHistoryRead

class ApplicantInfo(BaseModel):
    applicant_name: str = Field(..., min_length=2)
    designation: str = "Authorized Signatory"
    mobile: str = Field(..., pattern=r"^[6-9]\d{9}$")
    email: EmailStr

class BusinessInfo(BaseModel):
    business_name: str = Field(..., min_length=2)
    legal_name: Optional[str] = None
    organization_type: str = "PRIVATE_LIMITED"
    business_type: str = "MANUFACTURING_UNIT"
    kind_of_food_business: Optional[str] = "Food Manufacturing / Processing"
    business_activity: Optional[str] = "Packaged Snack Manufacturing"
    project_stage: str = "NEW"
    state: str = "Tamil Nadu"
    district: str = "Salem"
    pincode: str = "636001"
    address_line_1: str
    address_line_2: Optional[str] = None
    landmark: Optional[str] = None
    investment_amount: Optional[float] = 0.0
    employee_count: Optional[int] = 0
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    udyam_number: Optional[str] = None

class PremisesInfo(BaseModel):
    ownership_type: OwnershipType = OwnershipType.OWNED
    address_line_1: str
    address_line_2: Optional[str] = None
    state: str
    district: str
    pincode: str
    landmark: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class FoodProductInfo(BaseModel):
    id: Optional[str] = None
    product_name: str
    product_category: str
    description: Optional[str] = None
    ingredients: Optional[str] = None
    manufacturing_process_description: Optional[str] = None
    expected_capacity: Optional[float] = 0.0
    unit_of_measure: Optional[str] = "kg/day"

class ApplicationSaveDraftRequest(BaseModel):
    applicant: Optional[ApplicantInfo] = None
    business: Optional[BusinessInfo] = None
    activities: Optional[List[str]] = None
    premises: Optional[PremisesInfo] = None
    products: Optional[List[FoodProductInfo]] = None
    installed_capacity_details: Optional[str] = None
    machinery_details: Optional[str] = None

class ApplicationSubmitRequest(BaseModel):
    otp: str = Field(..., min_length=4, max_length=8)

class ApplicationRead(BaseModel):
    id: str
    application_number: str
    external_reference_id: Optional[str] = None
    source_system: str
    application_type: ApplicationType
    status: ApplicationStatus
    submission_date: Optional[datetime] = None
    last_status_updated_at: datetime
    assigned_officer_id: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    risk_level: RiskLevel
    installed_capacity_details: Optional[str] = None
    machinery_details: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    applicant: Optional[ApplicantInfo] = None
    business: Optional[BusinessInfo] = None
    premises: Optional[PremisesInfo] = None
    activities: List[str] = []
    products: List[FoodProductInfo] = []
    documents: List[DocumentRead] = []
    queries: List[QueryRead] = []
    inspections: List[InspectionRead] = []
    status_history: List[StatusHistoryRead] = []

    # Verification / checklist indicators
    is_applicant_verified: bool = False
    is_mobile_verified: bool = False
    is_email_verified: bool = False
    missing_mandatory_fields: List[str] = []
    missing_mandatory_documents: List[str] = []

    class Config:
        from_attributes = True

class ApplicationListItem(BaseModel):
    id: str
    application_number: str
    external_reference_id: Optional[str] = None
    business_name: str
    applicant_name: str
    application_type: ApplicationType
    status: ApplicationStatus
    state: str
    district: str
    submission_date: Optional[datetime] = None
    last_status_updated_at: datetime
    assigned_officer_name: Optional[str] = None
    risk_level: RiskLevel
    open_queries_count: int = 0
    inspection_status: Optional[str] = None
    created_at: datetime

class OfficerDashboardStats(BaseModel):
    total_applications: int
    new_submissions: int
    under_review: int
    document_queries: int
    inspection_required: int
    inspection_scheduled: int
    approved: int
    rejected: int
    withdrawn: int

class ApplicantDashboardStats(BaseModel):
    draft_count: int
    submitted_count: int
    under_review_count: int
    query_count: int
    inspection_count: int
    approved_count: int
