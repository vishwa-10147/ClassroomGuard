from __future__ import annotations

from backend.app.core.celery import celery_app


@celery_app.task
def scheduled_cleanup_old_evidence() -> dict:
    """Daily cleanup — intended for Celery Beat or external cron.

    Beat schedule (add to celery_app.conf.beat_schedule if using built-in Beat):

        "cleanup-daily": {
            "task": "app.tasks.scheduled.scheduled_cleanup_old_evidence",
            "schedule": crontab(hour=3, minute=0),
        }
    """
    from backend.app.tasks.alert_tasks import cleanup_old_evidence
    return cleanup_old_evidence.delay(days=30)


@celery_app.task
def scheduled_retention_enforcement() -> dict:
    """Daily retention enforcement — check all orgs, enforce retention policies.

    Cron:
        0 2 * * * celery -A app.core.celery call app.tasks.scheduled.scheduled_retention_enforcement

    Beat schedule:
        "retention-daily": {
            "task": "app.tasks.scheduled.scheduled_retention_enforcement",
            "schedule": crontab(hour=2, minute=0),
        }
    """
    from backend.app.tasks.retention_tasks import enforce_retention_policies
    return enforce_retention_policies.delay()
