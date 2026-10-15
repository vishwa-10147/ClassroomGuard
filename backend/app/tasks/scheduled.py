from __future__ import annotations

from backend.app.core.celery import celery_app

DEFAULT_RETENTION_DAYS = 90


async def _retention_days() -> int:
    """The "Data retention (days)" value from System Settings."""
    import json

    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models.system_setting import SystemSetting

    async with AsyncSessionLocal() as db:
        setting = await db.get(SystemSetting, "data_retention_days")
    if setting is None:
        return DEFAULT_RETENTION_DAYS
    try:
        return max(1, int(json.loads(setting.value)))
    except (ValueError, TypeError):
        return DEFAULT_RETENTION_DAYS


@celery_app.task
def scheduled_cleanup_old_evidence() -> str:
    """Daily evidence cleanup using the retention period from System Settings."""
    from backend.app.tasks.alert_tasks import cleanup_old_evidence
    from backend.app.tasks.retention_tasks import _run_async

    return cleanup_old_evidence.delay(days=_run_async(_retention_days())).id


@celery_app.task
def scheduled_retention_enforcement() -> str:
    """Daily retention enforcement for all organisations (scheduled in core/celery.py)."""
    from backend.app.tasks.retention_tasks import enforce_retention_policies
    return enforce_retention_policies.delay().id


@celery_app.task
def scheduled_weekly_report() -> str:
    from backend.app.tasks.alert_tasks import generate_report
    # Send report to system admin
    return generate_report.delay(report_type="weekly", params={"email": "admin@classroomguard.local"}).id


async def _mark_stale_cameras_offline() -> int:
    from datetime import UTC, datetime, timedelta

    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models.camera import Camera
    from sqlalchemy import update

    cutoff = datetime.now(UTC) - timedelta(seconds=CAMERA_STALE_AFTER_S)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            update(Camera)
            .where(Camera.status == "online", Camera.updated_at < cutoff)
            .values(status="offline", fps=0, ai_processing=False)
        )
        await db.commit()
        return result.rowcount or 0


CAMERA_STALE_AFTER_S = 120


@celery_app.task
def scheduled_mark_stale_cameras_offline() -> int:
    """Cameras whose AI engine stopped reporting them go offline (heartbeats come every 30 s)."""
    from backend.app.tasks.retention_tasks import _run_async

    return _run_async(_mark_stale_cameras_offline())

