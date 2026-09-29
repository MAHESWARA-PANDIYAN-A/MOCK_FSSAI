from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import Notification

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

notification_service = NotificationService()
