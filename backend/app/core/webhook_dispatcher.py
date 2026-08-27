from __future__ import annotations

import logging

from backend.app.core.database import AsyncSessionLocal
from backend.app.models.webhook import Webhook
from sqlalchemy import select

logger = logging.getLogger(__name__)

VALID_EVENTS = {
    "alert.created",
    "alert.resolved",
    "camera.offline",
    "user.login",
}


async def dispatch_event(event: str, payload: dict, organization_id: str | None = None) -> int:
    """Find matching active webhooks and queue delivery via Celery.

    Returns the number of webhooks queued.
    """
    if event not in VALID_EVENTS:
        logger.warning("dispatch_event: unknown event %s", event)
        return 0

    from backend.app.tasks.webhook_tasks import deliver_webhook_task

    async with AsyncSessionLocal() as db:
        query = (
            select(Webhook)
            .where(Webhook.is_active.is_(True))
            .where(Webhook.events.contains(event))
        )
        if organization_id:
            query = query.where(Webhook.organization_id == organization_id)
        else:
            query = query.where(Webhook.organization_id.is_(None))

        result = await db.execute(query)
        webhooks = result.scalars().all()

        for webhook in webhooks:
            deliver_webhook_task.delay(webhook.id, event, payload)

        return len(webhooks)
