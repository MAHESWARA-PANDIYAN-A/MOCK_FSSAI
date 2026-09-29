from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models.models import User, Applicant, ApplicationContact, Application
from app.models.enums import UserRole
from app.schemas.auth import (
    UserRegisterRequest, UserLoginRequest, TokenResponse, UserRead,
    SendOtpRequest, VerifyOtpRequest
)
from app.schemas.common import ApiResponse
from app.services.otp_service import otp_service
from app.services.audit_service import audit_service
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=ApiResponse[TokenResponse])
def register_user(req: UserRegisterRequest, request: Request, db: Session = Depends(get_db)):
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")
    
    existing_user = db.query(User).filter((User.email == req.email.lower()) | (User.mobile == req.mobile)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email or mobile already exists.")

    user = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        mobile=req.mobile.strip(),
        password_hash=get_password_hash(req.password),
        role=UserRole.APPLICANT,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create Applicant Profile
    applicant = Applicant(
        user_id=user.id,
        applicant_name=user.name,
        designation="Authorized Signatory",
        mobile=user.mobile,
        email=user.email
    )
    db.add(applicant)
    db.commit()

    # Log audit
    audit_service.log(
        db,
        action="USER_REGISTER",
        entity_type="USER",
        entity_id=user.id,
        user_id=user.id,
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    access_token = create_access_token(subject=user.id, role=user.role.value)
    user_read = UserRead.model_validate(user)
    
    return ApiResponse(
        success=True,
        data=TokenResponse(access_token=access_token, user=user_read),
        message="Registration successful."
    )

@router.post("/login", response_model=ApiResponse[TokenResponse])
def login_user(req: UserLoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        audit_service.log(
            db,
            action="FAILED_LOGIN",
            entity_type="USER",
            metadata={"email": req.email},
            ip_address=request.client.host if request.client else None
        )
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account has been deactivated.")

    # Role check if requested
    if req.role and user.role != req.role:
        raise HTTPException(status_code=403, detail=f"Access denied for role {req.role.value}.")

    access_token = create_access_token(subject=user.id, role=user.role.value)
    user_read = UserRead.model_validate(user)

    audit_service.log(
        db,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id,
        user_id=user.id,
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return ApiResponse(
        success=True,
        data=TokenResponse(access_token=access_token, user=user_read),
        message="Login successful."
    )

@router.get("/me", response_model=ApiResponse[UserRead])
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return ApiResponse(
        success=True,
        data=UserRead.model_validate(current_user),
        message="User profile retrieved."
    )

@router.post("/send-otp", response_model=ApiResponse[dict])
def send_mock_otp(req: SendOtpRequest, db: Session = Depends(get_db)):
    otp_code = otp_service.generate_otp()
    expiry = otp_service.get_expiry()

    if req.application_id:
        contact = db.query(ApplicationContact).filter(ApplicationContact.application_id == req.application_id).first()
        if contact:
            contact.otp_code = otp_code
            contact.otp_expires_at = expiry
            contact.otp_attempt_count = 0
            db.commit()

    demo_hint = f" (Demo OTP: {settings.MOCK_OTP})" if settings.ENV == "development" else ""
    return ApiResponse(
        success=True,
        data={
            "mock_otp": settings.MOCK_OTP if settings.ENV == "development" else None,
            "expires_in_minutes": settings.OTP_EXPIRY_MINUTES
        },
        message=f"Verification code sent to registered mobile/email.{demo_hint}"
    )

@router.post("/verify-otp", response_model=ApiResponse[dict])
def verify_mock_otp(req: VerifyOtpRequest, db: Session = Depends(get_db)):
    # If application_id provided, verify against ApplicationContact
    if req.application_id:
        contact = db.query(ApplicationContact).filter(ApplicationContact.application_id == req.application_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Application contact record not found.")
        
        contact.otp_attempt_count += 1
        valid, err_msg = otp_service.verify_otp(
            entered_otp=req.otp,
            actual_otp=contact.otp_code or settings.MOCK_OTP,
            expires_at=contact.otp_expires_at or otp_service.get_expiry(),
            attempt_count=contact.otp_attempt_count
        )
        if not valid:
            db.commit()
            raise HTTPException(status_code=400, detail=err_msg)
        
        contact.mobile_verified = True
        contact.email_verified = True
        db.commit()
        return ApiResponse(success=True, data={"verified": True}, message="Contact verification successful.")
    
    # Generic OTP check
    if req.otp.strip() == settings.MOCK_OTP:
        return ApiResponse(success=True, data={"verified": True}, message="Contact verification successful.")
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP code.")
