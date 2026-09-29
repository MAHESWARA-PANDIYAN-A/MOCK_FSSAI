from typing import Optional, Any
from sqlalchemy.orm import Session
from app.models.models import AuditLog, Notification

class AuditService:
    @staticmethod
    def log(
        db: Session,
        action: str,
        entity_type: str,
        entity_id: Optional[str] = None,
        user_id: Optional[str] = None,
        metadata: Optional[Any] = None,
        ip_address: Optional[str] = None
    ) -> AuditLog:
        # Sanitize metadata to never store passwords or secrets
        clean_metadata = None
        if isinstance(metadata, dict):
            clean_metadata = {
                k: ("***" if "password" in k.lower() or "secret" in k.lower() or "token" in k.lower() or "otp" in k.lower() else v)
                for k, v in metadata.items()
            }
        elif metadata:
            clean_metadata = str(metadata)

        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id) if entity_id else None,
            metadata_json=clean_metadata,
            ip_address=ip_address
        )
        db.add(log_entry)
        db.flush()
        return log_entry

class NotificationService:
    @staticmethod
    def send(
        db: Session,
        user_id: str,
        title: str,
        message: str,
        notification_type: str = "INFO",
        link: Optional[str] = None
    ) -> Notification:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            is_read=False,
            link=link
        )
        db.add(notif)
        db.flush()
        return notif

audit_service = AuditService()
notification_service = NotificationService()
