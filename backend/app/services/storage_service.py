import os
import uuid
import shutil
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
from app.core.config import settings

class StorageService:
    def __init__(self):
        self.upload_dir = os.path.abspath(settings.UPLOAD_DIR)
        os.makedirs(self.upload_dir, exist_ok=True)

    def validate_file(self, file: UploadFile) -> Tuple[bool, str]:
        # Validate file size
        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
        
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if size > max_bytes:
            return False, f"File size ({size / (1024*1024):.2f}MB) exceeds maximum allowed limit ({settings.MAX_UPLOAD_SIZE_MB}MB)."
        
        if size == 0:
            return False, "File is empty."

        # Validate file extension
        _, ext = os.path.splitext(file.filename or "")
        ext = ext.lower()
        if ext not in settings.ALLOWED_EXTENSIONS:
            return False, f"Unsupported file extension '{ext}'. Allowed extensions: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        
        # Validate MIME type
        content_type = (file.content_type or "").lower()
        if content_type not in settings.ALLOWED_MIME_TYPES:
            # Fallback check if extension matches standard mime
            valid_mime_map = {
                ".pdf": "application/pdf",
                ".jpg": ["image/jpeg", "image/pjpeg"],
                ".jpeg": ["image/jpeg", "image/pjpeg"],
                ".png": ["image/png"]
            }
            allowed = valid_mime_map.get(ext, [])
            if isinstance(allowed, str):
                allowed = [allowed]
            if content_type not in allowed and not any(m in content_type for m in ["pdf", "jpeg", "png", "jpg", "octet-stream"]):
                return False, f"Invalid file content type '{content_type}'."

        return True, "File is valid."

    async def save_file(self, file: UploadFile, application_number: str) -> Tuple[str, str, int, str]:
        valid, msg = self.validate_file(file)
        if not valid:
            raise HTTPException(status_code=400, detail=msg)
        
        # Create application subfolder for isolation
        safe_app_dir = "".join(c for c in application_number if c.isalnum() or c in ("-", "_"))
        target_dir = os.path.join(self.upload_dir, safe_app_dir)
        os.makedirs(target_dir, exist_ok=True)

        # Generate unique storage filename
        _, ext = os.path.splitext(file.filename or "")
        stored_filename = f"doc_{uuid.uuid4().hex[:12]}{ext.lower()}"
        file_path = os.path.join(target_dir, stored_filename)

        # Write content safely
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(file_path)
        mime_type = file.content_type or "application/octet-stream"

        return file.filename, stored_filename, file_size, file_path

    def get_file_path(self, stored_file_path: str) -> Optional[str]:
        abs_path = os.path.abspath(stored_file_path)
        # Prevent directory traversal
        if not abs_path.startswith(self.upload_dir):
            return None
        if not os.path.exists(abs_path):
            return None
        return abs_path

storage_service = StorageService()
