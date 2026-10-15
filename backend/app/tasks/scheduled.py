from __future__ import annotations

from backend.app.core.celery import celery_app


@celery_app.task
def scheduled_cleanup_old_evidence() -> str:
    """Daily evidence cleanup (scheduled in core/celery.py beat_schedule)."""
    from backend.app.tasks.alert_tasks import cleanup_old_evidence
    return cleanup_old_evidence.delay(days=30).id


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
