from __future__ import annotations

import asyncio
import json
import logging
import os
import zipfile
from datetime import datetime, timezone

from backend.app.core.celery import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _compile_user_data_export_inner(user_id: str, org_id: str | None) -> dict:
    from sqlalchemy import select
    from backend.app.core.database import AsyncSessionLocal
    from backend.app.models.alert import Alert
    from backend.app.models.audit_log import AuditLog
    from backend.app.models.consent import UserConsent
    from backend.app.models.detection_event import DetectionEvent
    from backend.app.models.recording import Recording
    from backend.app.models.user import User
    from backend.app.models.compliance_log import ComplianceLog

    data = {
        "user_id": user_id,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": {},
        "alerts": [],
        "detection_events": [],
        "recordings": [],
        "audit_logs": [],
        "consents": [],
    }

    async with AsyncSessionLocal() as db:
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if user:
            data["profile"] = {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "role": user.role,
                "created_at": user.created_at.isoformat() if user.created_at else None,
            }

        alerts_result = await db.execute(
            select(Alert).where(Alert.assigned_to == user_id)
        )
        for a in alerts_result.scalars().all():
            data["alerts"].append({
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "severity": a.severity,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            })

        events_result = await db.execute(
            select(DetectionEvent).where(DetectionEvent.severity.isnot(None)).limit(1000)
        )
        for e in events_result.scalars().all():
            data["detection_events"].append({
                "id": e.id,
                "event_type": e.event_type,
                "severity": e.severity,
                "timestamp": e.timestamp.isoformat() if e.timestamp else None,
            })

        recordings_result = await db.execute(select(Recording).limit(1000))
        for r in recordings_result.scalars().all():
            data["recordings"].append({
                "id": r.id,
                "name": r.name,
                "duration": r.duration,
                "file_size": r.file_size,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            })

        audit_result = await db.execute(
            select(AuditLog).where(AuditLog.user_id == user_id)
        )
        for log_entry in audit_result.scalars().all():
            data["audit_logs"].append({
                "id": log_entry.id,
                "action": log_entry.action,
                "resource_type": log_entry.resource_type,
                "timestamp": log_entry.timestamp.isoformat() if log_entry.timestamp else None,
            })

        consents_result = await db.execute(
            select(UserConsent).where(UserConsent.user_id == user_id)
        )
        for c in consents_result.scalars().all():
            data["consents"].append({
                "id": c.id,
                "consent_type": c.consent_type,
                "granted": c.granted,
                "granted_at": c.granted_at.isoformat() if c.granted_at else None,
                "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
            })

    storage = os.environ.get("STORAGE_PATH", "./storage")
    exports_dir = os.path.join(storage, "exports")
    os.makedirs(exports_dir, exist_ok=True)

    filename = f"user_export_{user_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.zip"
    file_path = os.path.join(exports_dir, filename)

    with zipfile.ZipFile(file_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("user_data.json", json.dumps(data, indent=2, default=str))

    async with AsyncSessionLocal() as db:
        compliance_entry = ComplianceLog(
            event_type="data_export",
            user_id=user_id,
            details={"file_path": file_path, "record_count": sum(
                len(v) for v in data.values() if isinstance(v, list)
            )},
            legal_basis="consent",
        )
        db.add(compliance_entry)
        await db.commit()

    return {"status": "completed", "file_path": file_path, "user_id": user_id}


@celery_app.task(bind=True, max_retries=2, soft_time_limit=1800, time_limit=1860)
def compile_user_data_export(self, user_id: str, org_id: str | None = None) -> dict:
    """Compile all user data into a ZIP for GDPR data portability."""
    try:
        return _run_async(_compile_user_data_export_inner(user_id, org_id))
    except Exception as exc:
        logger.exception("compile_user_data_export failed for user %s", user_id)
        raise self.retry(exc=exc)
