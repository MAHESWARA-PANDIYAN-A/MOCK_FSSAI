from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.models.enums import UserRole

class UserRegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    mobile: str = Field(..., pattern=r"^[6-9]\d{9}$")
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: Optional[UserRole] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"

class UserRead(BaseModel):
    id: str
    name: str
    email: str
    mobile: str
    role: UserRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class SendOtpRequest(BaseModel):
    application_id: Optional[str] = None
    mobile: Optional[str] = None
    email: Optional[str] = None

class VerifyOtpRequest(BaseModel):
    application_id: Optional[str] = None
    mobile: Optional[str] = None
    otp: str = Field(..., min_length=4, max_length=8)

TokenResponse.model_rebuild()
