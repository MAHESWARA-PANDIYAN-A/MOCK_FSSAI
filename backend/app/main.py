import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import text
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.seed.seed_data import seed_database
from app.routers import auth, applicant, officer, documents, integration, admin

# Ensure tables and initial seed
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure tables
    Base.metadata.create_all(bind=engine)
    
    # Run seed
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Ensure upload directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield

app = FastAPI(
    title="Mock FSSAI / Food Safety Approval Portal (SIH26130)",
    description=(
        "Simulated Food Safety and Standards Authority approval portal API for SIH26130. "
        "Provides comprehensive endpoints for Applicant workflow, Officer review/inspection workflow, "
        "and authenticated Integration API for Main SIH portal prefill, status synchronization, and submissions."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"^(http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?|https:\/\/.*\.vercel\.app|https:\/\/.*\.onrender\.com)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers for consistent API responses
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if isinstance(exc.detail, dict):
        error_payload = {
            "code": exc.detail.get("code", f"HTTP_{exc.status_code}"),
            "message": exc.detail.get("message", "An error occurred."),
            **{k: v for k, v in exc.detail.items() if k not in ("code", "message")}
        }
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": error_payload
            }
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail
            }
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err["loc"])
        errors.append(f"{field}: {err['msg']}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Invalid request data. Please check the entered fields.",
                "details": errors
            }
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc)
            }
        }
    )

# Health check & Root info
@app.get("/", tags=["Root"])
def root_info():
    return {
        "service": "Mock FSSAI / Food Safety Approval Portal (SIH26130)",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/api/health",
        "status": "online"
    }

@app.get("/api/health", tags=["Health"])
def health_check():
    db_status = "connected"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception:
        db_status = "unavailable"

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "mock-fssai-portal",
        "database": db_status,
        "environment": settings.ENV,
        "version": settings.VERSION
    }

# Register Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(applicant.router, prefix="/api/v1")
app.include_router(officer.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(integration.router, prefix="/api")  # /api/integrations/v1

from sqlalchemy.orm import Session
from app.core.database import get_db

# Document status compatibility endpoint as specified in requirement 9
@app.get("/api/applications/{application_id}/documents", tags=["Document Center"])
def get_documents_compatibility(
    application_id: str,
    db: Session = Depends(get_db)
):
    from app.routers.documents import get_application_documents_status
    return get_application_documents_status(app_id_or_number=application_id, current_user=None, db=db)
