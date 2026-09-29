import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

class WebhookService:
    @staticmethod
    async def dispatch_event(
        event_name: str,
        application_number: str,
        external_reference_id: Optional[str],
        old_status: Optional[str],
        new_status: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        webhook_url = settings.SIH_WEBHOOK_URL
        if not webhook_url:
            return True  # Webhook not configured, skip silently
        
        payload = {
            "event": event_name,
            "application_number": application_number,
            "external_reference_id": external_reference_id,
            "old_status": old_status,
            "new_status": new_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata or {}
        }

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.post(webhook_url, json=payload, headers={"Content-Type": "application/json"})
                if res.status_code >= 400:
                    logger.warning(f"Webhook to {webhook_url} returned status code {res.status_code}")
                    return False
                return True
        except Exception as e:
            logger.error(f"Failed to deliver webhook to {webhook_url}: {str(e)}")
            return False

webhook_service = WebhookService()
