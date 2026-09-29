from datetime import datetime, timedelta, timezone
from typing import Tuple
from app.core.config import settings

class OtpService:
    @staticmethod
    def generate_otp() -> str:
        # In development mode, use settings.MOCK_OTP (default: 123456)
        if settings.ENV == "development" or settings.MOCK_OTP:
            return settings.MOCK_OTP
        import random
        return f"{random.randint(100000, 999999)}"

    @staticmethod
    def get_expiry() -> datetime:
        return datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    @staticmethod
    def verify_otp(entered_otp: str, actual_otp: str, expires_at: datetime, attempt_count: int) -> Tuple[bool, str]:
        if attempt_count >= 5:
            return False, "Maximum verification attempts exceeded. Please request a new OTP."
        
        now = datetime.now(timezone.utc)
        if expires_at and expires_at.tzinfo is None:
            # Handle naive datetime from sqlite
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at and now > expires_at:
            return False, "OTP has expired. Please request a new OTP."
        
        if entered_otp.strip() != actual_otp.strip():
            return False, "Invalid OTP. Please check the code and try again."
        
        return True, "OTP verified successfully."

otp_service = OtpService()
