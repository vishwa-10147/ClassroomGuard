from __future__ import annotations

import asyncio
import logging

from backend.app.core.celery import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _enforce_retention_inner() -> dict:
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models.retention_policy import RetentionPolicy
    from backend.app.services.retention_service import delete_expired
    from sqlalchemy import select

    results = {}

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(RetentionPolicy).where(RetentionPolicy.is_active.is_(True))
        )
        policies = result.scalars().all()

        org_ids: set[str | None] = set()
        for p in policies:
            if p.organization_id:
                org_ids.add(p.organization_id)

        org_ids.add(None)

        for org_id in org_ids:
            org_result = await delete_expired(db, organization_id=org_id, dry_run=False)
            results[org_id or "default"] = org_result

    return results


@celery_app.task(bind=True, max_retries=2, soft_time_limit=3600, time_limit=3660)
def enforce_retention_policies(self) -> dict:
    """Daily — check all orgs, enforce retention policies.

    Schedule with Celery Beat or cron:
        0 2 * * * celery -A app.core.celery call app.tasks.retention_tasks.enforce_retention_policies
    """
    try:
        result = _run_async(_enforce_retention_inner())
        logger.info("Retention enforcement completed: %s", result)
        return {"status": "completed", "results": result}
    except Exception as exc:
        logger.exception("enforce_retention_policies failed")
        raise self.retry(exc=exc)
