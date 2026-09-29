import os
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.core.dependencies import get_current_user, check_application_ownership
from app.models.models import User, Application, Document, DocumentRequirement
from app.models.enums import UserRole, ApplicationStatus, DocumentReviewStatus
from app.schemas.document import DocumentRequirementRead, DocumentRead, DocumentUploadResponse
from app.schemas.common import ApiResponse
from app.services.storage_service import storage_service
from app.services.audit_service import audit_service

router = APIRouter(prefix="/documents", tags=["Document Center"])

@router.get("/requirements", response_model=ApiResponse[List[DocumentRequirementRead]])
def list_document_requirements(db: Session = Depends(get_db)):
    reqs = db.query(DocumentRequirement).filter(DocumentRequirement.is_active == True).all()
    return ApiResponse(
        success=True,
        data=[DocumentRequirementRead.model_validate(r) for r in reqs],
        message="Document requirements retrieved."
    )

from app.core.dependencies import get_current_user, get_current_user_or_api_key, check_application_ownership

@router.get("/application/{app_id_or_number}")
def get_application_documents_status(
    app_id_or_number: str,
    current_user: Optional[User] = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_application_ownership(app, current_user)
    
    reqs = db.query(DocumentRequirement).filter(DocumentRequirement.is_active == True).all()
    docs_by_req = {d.requirement_id: d for d in (app.documents or [])}

    result = []
    for r in reqs:
        doc = docs_by_req.get(r.id)
        # Status mapping: if doc exists and review_status is PENDING_REVIEW, status is UPLOADED; otherwise the review status
        doc_status = "NOT_UPLOADED"
        if doc:
            if doc.review_status == DocumentReviewStatus.PENDING_REVIEW:
                doc_status = "UPLOADED"
            else:
                doc_status = doc.review_status.value

        result.append({
            "id": doc.id if doc else None,
            "requirement_id": r.id,
            "document_type": r.id.upper(),
            "name": r.name,
            "description": r.description,
            "required": True,
            "status": doc_status,
            "review_status": doc.review_status.value if doc else None,
            "original_filename": doc.original_filename if doc else None,
            "file_size": doc.file_size if doc else None,
            "officer_comment": doc.officer_comment if doc else None,
            "uploaded_at": doc.uploaded_at.isoformat() if doc else None,
        })

    return {
        "success": True,
        "data": result,
        "documents": result,
        "message": "Application documents status retrieved."
    }

@router.post("/upload/{app_id_or_number}", response_model=ApiResponse[DocumentUploadResponse])
async def upload_document(
    app_id_or_number: str,
    request: Request,
    requirement_id: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    app = db.query(Application).filter(
        or_(Application.id == app_id_or_number, Application.application_number == app_id_or_number)
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found.")

    check_application_ownership(app, current_user)

    if app.status not in (ApplicationStatus.DRAFT, ApplicationStatus.DOCUMENT_QUERY, ApplicationStatus.UNDER_REVIEW):
        raise HTTPException(status_code=400, detail=f"Cannot upload documents in {app.status.value} status.")

    doc_req = db.query(DocumentRequirement).filter(DocumentRequirement.id == requirement_id).first()
    if not doc_req:
        raise HTTPException(status_code=404, detail=f"Document requirement '{requirement_id}' not recognized.")

    # Save file securely
    orig_name, stored_name, file_size, file_path = await storage_service.save_file(file, app.application_number)

    # Check if a document with this requirement already exists for this application
    existing_doc = db.query(Document).filter(
        Document.application_id == app.id,
        Document.requirement_id == requirement_id
    ).first()

    if existing_doc:
        existing_doc.original_filename = orig_name
        existing_doc.stored_filename = stored_name
        existing_doc.file_path = file_path
        existing_doc.file_size = file_size
        existing_doc.mime_type = file.content_type or "application/octet-stream"
        existing_doc.review_status = DocumentReviewStatus.PENDING_REVIEW
        existing_doc.officer_comment = None
        existing_doc.uploaded_at = datetime.now(timezone.utc)
        doc_record = existing_doc
    else:
        doc_record = Document(
            application_id=app.id,
            requirement_id=requirement_id,
            original_filename=orig_name,
            stored_filename=stored_name,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type or "application/octet-stream",
            review_status=DocumentReviewStatus.PENDING_REVIEW
        )
        db.add(doc_record)

    audit_service.log(
        db,
        action="DOCUMENT_UPLOADED",
        entity_type="DOCUMENT",
        entity_id=app.id,
        user_id=current_user.id,
        metadata={"requirement_id": requirement_id, "filename": orig_name, "size": file_size},
        ip_address=request.client.host if request.client else None
    )
    db.commit()
    db.refresh(doc_record)

    return ApiResponse(
        success=True,
        data=DocumentUploadResponse(
            id=doc_record.id,
            application_id=doc_record.application_id,
            requirement_id=doc_record.requirement_id,
            original_filename=doc_record.original_filename,
            file_size=doc_record.file_size,
            review_status=doc_record.review_status,
            uploaded_at=doc_record.uploaded_at
        ),
        message="Document uploaded successfully."
    )

@router.get("/view/{document_id}")
def view_or_download_document(
    document_id: str,
    download: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Authorization
    app = db.query(Application).filter(Application.id == doc.application_id).first()
    if app:
        check_application_ownership(app, current_user)

    safe_path = storage_service.get_file_path(doc.file_path)
    if not safe_path or not os.path.exists(safe_path):
        raise HTTPException(status_code=404, detail="Physical document file missing on disk.")

    disposition = "attachment" if download else "inline"
    return FileResponse(
        path=safe_path,
        media_type=doc.mime_type or "application/octet-stream",
        filename=doc.original_filename,
        headers={"Content-Disposition": f'{disposition}; filename="{doc.original_filename}"'}
    )

@router.delete("/{document_id}", response_model=ApiResponse[dict])
def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    app = db.query(Application).filter(Application.id == doc.application_id).first()
    if app:
        check_application_ownership(app, current_user)
        if app.status not in (ApplicationStatus.DRAFT, ApplicationStatus.DOCUMENT_QUERY):
            raise HTTPException(status_code=400, detail="Cannot delete documents after submission.")

    # Delete physical file safely if exists
    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass

    db.delete(doc)
    db.commit()

    return ApiResponse(
        success=True,
        data={"deleted": True},
        message="Document removed successfully."
    )
