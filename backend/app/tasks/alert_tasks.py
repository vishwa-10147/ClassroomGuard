from __future__ import annotations

import asyncio
import logging
import os
from datetime import UTC, datetime, timedelta

from backend.app.core.celery import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Run an async coroutine from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _process_alert_inner(alert_id: str) -> None:
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.core.websocket import manager
    from backend.app.models.alert import Alert
    from backend.app.models.push_token import PushToken
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Alert).where(Alert.id == alert_id))
        alert = result.scalar_one_or_none()
        if alert is None:
            logger.warning("process_alert: alert %s not found", alert_id)
            return

        # Send push notifications
        try:
            tokens_result = await db.execute(
                select(PushToken.token).where(PushToken.is_active)
            )
            tokens = [row[0] for row in tokens_result.all()]
            if tokens:
                from backend.app.api.notifications import send_push_notification
                for token in tokens:
                    try:
                        await send_push_notification(
                            token=token,
                            title=alert.title,
                            body=alert.description,
                            data={"alert_id": str(alert.id), "severity": alert.severity},
                        )
                    except Exception:
                        logger.debug("Push notification failed for token", exc_info=True)
        except Exception:
            logger.debug("Failed to fetch push tokens", exc_info=True)

        # Broadcast via WebSocket (Redis pub/sub in production)
        try:
            await manager.broadcast({
                "type": "alert",
                "payload": {
                    "id": str(alert.id),
                    "title": alert.title,
                    "description": alert.description,
                    "severity": alert.severity,
                    "status": alert.status,
                    "classroom_id": str(alert.classroom_id) if alert.classroom_id else None,
                    "camera_id": str(alert.camera_id) if alert.camera_id else None,
                    "created_at": alert.created_at.isoformat() if alert.created_at else None,
                },
            })
        except Exception:
            logger.debug("WS broadcast failed for alert %s", alert_id, exc_info=True)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_alert(self, alert_id: str) -> dict:
    """Post-process a newly created alert: push notifications + WS broadcast."""
    try:
        _run_async(_process_alert_inner(alert_id))
        return {"status": "ok", "alert_id": alert_id}
    except Exception as exc:
        logger.exception("process_alert failed for %s", alert_id)
        raise self.retry(exc=exc)


@celery_app.task(bind=True, max_retries=2)
def cleanup_old_evidence(self, days: int = 30) -> dict:
    """Delete evidence files older than *days* days."""
    storage = os.environ.get("STORAGE_PATH", "./storage")
    cutoff = datetime.now(UTC) - timedelta(days=days)
    removed = 0

    for root, _dirs, files in os.walk(storage):
        for fname in files:
            fpath = os.path.join(root, fname)
            try:
                mtime = datetime.fromtimestamp(os.path.getmtime(fpath), tz=UTC)
                if mtime < cutoff:
                    os.remove(fpath)
                    removed += 1
            except OSError:
                continue

    return {"removed": removed, "cutoff": cutoff.isoformat()}


@celery_app.task(bind=True, max_retries=2)
def generate_report(self, report_type: str = "summary", params: dict | None = None) -> dict:
    """Generate a report in the background.

    Currently returns a stub.  Plug in real PDF / CSV generation here.
    """
    params = params or {}
    return {
        "status": "completed",
        "report_type": report_type,
        "params": params,
        "generated_at": datetime.now(UTC).isoformat(),
    }


@celery_app.task(bind=True, max_retries=2, soft_time_limit=3600, time_limit=3660)
def batch_process_video(self, video_path: str, camera_id: str) -> dict:
    """Process an uploaded video through the AI detection pipeline."""
    if not os.path.isfile(video_path):
        return {"status": "error", "message": f"File not found: {video_path}"}

    # Placeholder — wire up the actual AI inference pipeline here.
    return {
        "status": "completed",
        "video_path": video_path,
        "camera_id": camera_id,
        "processed_at": datetime.now(UTC).isoformat(),
    }
