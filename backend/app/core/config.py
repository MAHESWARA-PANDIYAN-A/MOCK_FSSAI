import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    PROJECT_NAME: str = "Mock FSSAI / Food Safety Approval Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    INTEGRATION_V1_STR: str = "/api/integrations/v1"
    
    # Environment & Security
    ENV: str = "development"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./fssai_mock.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-fssai-mock-jwt-key-2026-sih")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Integration Secret
    MOCK_FSSAI_API_KEY: str = os.getenv("MOCK_FSSAI_API_KEY", "fssai-mock-secret-key-2026")
    
    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    MAIN_SIH_PORTAL_URL: str = os.getenv("MAIN_SIH_PORTAL_URL", "http://localhost:3000")
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5176",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
    ]

    @property
    def cors_origins(self) -> List[str]:
        origins = list(self.ALLOWED_ORIGINS)
        if self.FRONTEND_URL and self.FRONTEND_URL not in origins:
            origins.append(self.FRONTEND_URL)
        if self.MAIN_SIH_PORTAL_URL and self.MAIN_SIH_PORTAL_URL not in origins:
            origins.append(self.MAIN_SIH_PORTAL_URL)
        return origins
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../uploads")))
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "5"))
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".jpg", ".jpeg", ".png"]
    ALLOWED_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/jpg"
    ]
    
    # OTP config
    MOCK_OTP: str = os.getenv("MOCK_OTP", "123456")
    OTP_EXPIRY_MINUTES: int = 10
    
    # Webhooks
    SIH_WEBHOOK_URL: Optional[str] = os.getenv("SIH_WEBHOOK_URL", None)

settings = Settings()
