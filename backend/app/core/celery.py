from __future__ import annotations

from backend.app.core.config import settings
from celery import Celery

broker_url = settings.redis_url.replace("/0", "/1") if settings.use_redis else "memory://"
result_backend = settings.redis_url.replace("/0", "/2") if settings.use_redis else "cache+memory://"

celery_app = Celery(
    "classguard",
    broker=broker_url,
    backend=result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_soft_time_limit=600,
    task_time_limit=900,
)

celery_app.autodiscover_tasks(["app.tasks"])
