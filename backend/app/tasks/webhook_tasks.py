from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime

from backend.app.core.celery import celery_app
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.webhook import Webhook
from backend.app.models.webhook_delivery import WebhookDelivery
from backend.app.services.webhook_service import deliver_webhook
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _deliver_inner(webhook_id: str, event: str, payload: dict) -> dict:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
        webhook = result.scalar_one_or_none()
        if webhook is None:
            logger.warning("deliver_webhook_task: webhook %s not found", webhook_id)
            return {"status": "skipped", "reason": "not_found"}

        delivery_result = await deliver_webhook(webhook, event, payload)

        delivery = WebhookDelivery(
            webhook_id=webhook_id,
            event=event,
            status=delivery_result["status"],
            status_code=delivery_result.get("status_code"),
            request_body=json.dumps({"event": event, "data": payload})[:5000],
            response_body=delivery_result.get("response_body"),
            duration_ms=delivery_result.get("duration_ms"),
            error_message=delivery_result.get("error_message"),
        )
        db.add(delivery)

        if delivery_result["status"] == "success":
            webhook.last_triggered_at = datetime.now(UTC)
            webhook.failure_count = 0
        else:
            webhook.failure_count += 1
            if webhook.failure_count >= 10:
                webhook.is_active = False
                logger.warning(
                    "Webhook %s auto-disabled after %d failures",
                    webhook_id,
                    webhook.failure_count,
                )

        await db.commit()
        return delivery_result


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def deliver_webhook_task(self, webhook_id: str, event: str, payload: dict) -> dict:
    """Async webhook delivery via Celery with retry."""
    try:
        return _run_async(_deliver_inner(webhook_id, event, payload))
    except Exception as exc:
        logger.exception("deliver_webhook_task failed for %s", webhook_id)
        raise self.retry(exc=exc)
