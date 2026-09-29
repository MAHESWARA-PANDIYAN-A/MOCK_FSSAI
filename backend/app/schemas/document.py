from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from app.models.enums import ApplicabilityType, DocumentReviewStatus

class DocumentRequirementRead(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    applicable_activity: Optional[str] = None
    applicability_type: ApplicabilityType
    allowed_file_types: str
    max_file_size_mb: int
    source_reference: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True

class DocumentRead(BaseModel):
    id: str
    application_id: str
    requirement_id: str
    requirement_name: Optional[str] = None
    original_filename: str
    file_path: str
    mime_type: str
    file_size: int
    upload_status: str
    review_status: DocumentReviewStatus
    officer_comment: Optional[str] = None
    uploaded_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class DocumentReviewRequest(BaseModel):
    review_status: DocumentReviewStatus
    officer_comment: Optional[str] = None

class DocumentUploadResponse(BaseModel):
    id: str
    application_id: str
    requirement_id: str
    original_filename: str
    file_size: int
    review_status: DocumentReviewStatus
    uploaded_at: datetime
