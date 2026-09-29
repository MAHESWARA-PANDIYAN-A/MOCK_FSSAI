from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.enums import QueryStatus, InspectionStatus, ApplicationStatus

class QueryCreateRequest(BaseModel):
    subject: str = Field(..., min_length=3, max_length=200)
    message: str = Field(..., min_length=5)
    deadline_days: Optional[int] = 7

class QueryRespondRequest(BaseModel):
    applicant_response: str = Field(..., min_length=3)

class QueryRead(BaseModel):
    id: str
    application_id: str
    officer_id: Optional[str] = None
    officer_name: Optional[str] = None
    subject: str
    message: str
    applicant_response: Optional[str] = None
    status: QueryStatus
    deadline_date: Optional[datetime] = None
    created_at: datetime
    responded_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InspectionCreateRequest(BaseModel):
    inspection_type: str = "Pre-Licensing Premises & Hygiene Inspection"
    scheduled_date: str = Field(..., description="YYYY-MM-DD")
    scheduled_time: str = Field(..., description="e.g. 10:30 AM")
    location: str
    instructions: Optional[str] = None

class InspectionUpdateRequest(BaseModel):
    status: InspectionStatus
    officer_notes: Optional[str] = None

class InspectionRead(BaseModel):
    id: str
    application_id: str
    officer_id: Optional[str] = None
    officer_name: Optional[str] = None
    inspection_type: str
    scheduled_date: str
    scheduled_time: str
    location: str
    instructions: Optional[str] = None
    status: InspectionStatus
    officer_notes: Optional[str] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StatusChangeRequest(BaseModel):
    new_status: ApplicationStatus
    reason: Optional[str] = None
    visible_to_applicant: bool = True

class StatusHistoryRead(BaseModel):
    id: str
    application_id: str
    old_status: Optional[ApplicationStatus] = None
    new_status: ApplicationStatus
    changed_by: str
    reason: Optional[str] = None
    visible_to_applicant: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogRead(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    metadata_json: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationRead(BaseModel):
    id: str
    title: str
    message: str
    type: str
    is_read: bool
    link: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
