from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.security import get_password_hash
from app.models.models import (
    User, Application, DocumentRequirement, AuditLog,
    IntegrationRequest
)
from app.models.enums import UserRole, ApplicabilityType
from app.schemas.auth import UserRead
from app.schemas.query_inspection import AuditLogRead
from app.schemas.document import DocumentRequirementRead
from app.schemas.common import ApiResponse, PaginatedData
from app.services.audit_service import audit_service
from pydantic import BaseModel, EmailStr, Field

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

class OfficerCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    mobile: str = Field(..., pattern=r"^[6-9]\d{9}$")
    password: str = Field(..., min_length=6)

class DocumentRuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    applicability_type: Optional[ApplicabilityType] = None
    applicable_activity: Optional[str] = None
    max_file_size_mb: Optional[int] = None
    is_active: Optional[bool] = None

class IntegrationRequestRead(BaseModel):
    id: str
    source_system: str
    endpoint: str
    external_reference_id: Optional[str] = None
    request_id: Optional[str] = None
    idempotency_key: Optional[str] = None
    status: str
    response_code: int
    processing_time_ms: float
    created_at: datetime

    class Config:
        from_attributes = True

@router.get("/officers", response_model=ApiResponse[List[UserRead]])
def list_officers(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    officers = db.query(User).filter(User.role.in_([UserRole.OFFICER, UserRole.ADMIN])).all()
    return ApiResponse(
        success=True,
        data=[UserRead.model_validate(u) for u in officers],
        message="Officers list retrieved."
    )

@router.post("/officers", response_model=ApiResponse[UserRead])
def create_officer(
    req: OfficerCreateRequest,
    request: Request,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter((User.email == req.email.lower().strip()) | (User.mobile == req.mobile.strip())).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email or mobile already exists.")

    new_officer = User(
        name=req.name.strip(),
        email=req.email.lower().strip(),
        mobile=req.mobile.strip(),
        password_hash=get_password_hash(req.password),
        role=UserRole.OFFICER,
        is_active=True
    )
    db.add(new_officer)
    db.commit()
    db.refresh(new_officer)

    audit_service.log(
        db,
        action="OFFICER_CREATED",
        entity_type="USER",
        entity_id=new_officer.id,
        user_id=current_user.id,
        metadata={"officer_name": req.name, "email": req.email},
        ip_address=request.client.host if request.client else None
    )
    db.commit()

    return ApiResponse(
        success=True,
        data=UserRead.model_validate(new_officer),
        message="Officer created successfully."
    )

@router.get("/audit-logs", response_model=ApiResponse[PaginatedData[AuditLogRead]])
def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OFFICER])),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    total = query.count()
    total_pages = (total + limit - 1) // limit if limit > 0 else 1
    
    offset = (page - 1) * limit
    logs = query.order_by(desc(AuditLog.created_at)).offset(offset).limit(limit).all()

    items = []
    for l in logs:
        items.append(AuditLogRead(
            id=l.id,
            user_id=l.user_id,
            user_name=l.user.name if l.user else "System / API",
            action=l.action,
            entity_type=l.entity_type,
            entity_id=l.entity_id,
            metadata_json=l.metadata_json,
            ip_address=l.ip_address,
            created_at=l.created_at
        ))

    return ApiResponse(
        success=True,
        data=PaginatedData(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        ),
        message="Audit logs loaded."
    )

@router.get("/integration-logs", response_model=ApiResponse[PaginatedData[IntegrationRequestRead]])
def list_integration_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    query = db.query(IntegrationRequest)
    total = query.count()
    total_pages = (total + limit - 1) // limit if limit > 0 else 1

    offset = (page - 1) * limit
    logs = query.order_by(desc(IntegrationRequest.created_at)).offset(offset).limit(limit).all()

    return ApiResponse(
        success=True,
        data=PaginatedData(
            items=[IntegrationRequestRead.model_validate(l) for l in logs],
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        ),
        message="Integration logs loaded."
    )

@router.get("/document-rules", response_model=ApiResponse[List[DocumentRequirementRead]])
def list_document_rules(
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    rules = db.query(DocumentRequirement).all()
    return ApiResponse(
        success=True,
        data=[DocumentRequirementRead.model_validate(r) for r in rules],
        message="Document configuration rules retrieved."
    )

@router.put("/document-rules/{rule_id}", response_model=ApiResponse[DocumentRequirementRead])
def update_document_rule(
    rule_id: str,
    req: DocumentRuleUpdateRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    rule = db.query(DocumentRequirement).filter(DocumentRequirement.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Document rule not found.")

    for field, val in req.model_dump(exclude_unset=True).items():
        setattr(rule, field, val)

    db.commit()
    db.refresh(rule)

    return ApiResponse(
        success=True,
        data=DocumentRequirementRead.model_validate(rule),
        message="Document rule updated successfully."
    )
