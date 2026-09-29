from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import ApplicationStatus
from app.schemas.application import ApplicantInfo, BusinessInfo, PremisesInfo, FoodProductInfo

class IntegrationPrefillRequest(BaseModel):
    external_reference_id: str = Field(..., description="Unique reference ID from Main SIH Portal, e.g. SIH-APP-1001")
    source_system: str = Field(default="SIH26130", description="Source system identifier")
    applicant: ApplicantInfo
    business: BusinessInfo
    activities: Optional[List[str]] = Field(default=["MANUFACTURING", "PROCESSING"])
    premises: Optional[PremisesInfo] = None
    products: Optional[List[FoodProductInfo]] = None
    installed_capacity_details: Optional[str] = None
    machinery_details: Optional[str] = None

class IntegrationPrefillResponse(BaseModel):
    success: bool = True
    application_id: str
    application_number: str
    external_reference_id: str
    status: ApplicationStatus
    prefilled_fields: int
    missing_fields: List[str]
    message: str = "Draft application created/pre-filled successfully."

class IntegrationStatusPendingAction(BaseModel):
    type: str  # "DOCUMENT", "QUERY", "INSPECTION", "VERIFICATION"
    message: str

class IntegrationInspectionDetail(BaseModel):
    id: str
    inspection_type: str
    scheduled_date: str
    scheduled_time: str
    location: str
    instructions: Optional[str] = None
    status: str
    officer_name: Optional[str] = "Officer Meena K"
    completed_at: Optional[str] = None
    officer_notes: Optional[str] = None

class IntegrationApprovalDetail(BaseModel):
    is_approved: bool
    license_number: Optional[str] = None
    approval_date: Optional[str] = None
    valid_until: Optional[str] = None
    acknowledgement_pdf_url: Optional[str] = None
    qr_verification_code: Optional[str] = None

class IntegrationDocumentSummary(BaseModel):
    requirement_id: str
    name: str
    status: str
    review_status: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    officer_comment: Optional[str] = None
    uploaded_at: Optional[str] = None

class IntegrationQuerySummary(BaseModel):
    id: str
    subject: str
    message: str
    applicant_response: Optional[str] = None
    status: str
    deadline_date: Optional[str] = None
    created_at: str

class IntegrationStatusResponse(BaseModel):
    application_number: str
    external_reference_id: Optional[str] = None
    status: ApplicationStatus
    last_updated_at: datetime
    pending_actions: List[IntegrationStatusPendingAction] = []
    officer_remarks: Optional[str] = None
    assigned_officer_name: Optional[str] = None
    queries_count: int = 0
    inspection_scheduled: bool = False
    approval_details: Optional[IntegrationApprovalDetail] = None
    inspection_details: Optional[IntegrationInspectionDetail] = None
    documents: List[IntegrationDocumentSummary] = []
    queries: List[IntegrationQuerySummary] = []
    timeline: List[Dict[str, Any]] = []

class IntegrationSubmitResponse(BaseModel):
    success: bool = True
    application_number: str
    status: ApplicationStatus
    message: str

class WebhookPayload(BaseModel):
    event: str
    application_number: str
    external_reference_id: Optional[str] = None
    old_status: Optional[str] = None
    new_status: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None
