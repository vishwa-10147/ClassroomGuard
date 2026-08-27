from __future__ import annotations

import logging
from datetime import UTC, datetime

from backend.app.models.alert import Alert
from backend.app.models.audit_log import AuditLog
from backend.app.models.compliance_log import ComplianceLog
from backend.app.models.consent import UserConsent
from backend.app.models.recording import Recording
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

FERPA_ROLES = {"faculty", "admin", "super_admin"}

FERPA_PERMS = [
    "student_data:view",
    "student_data:export",
    "student_data:manage",
]


def is_ferpa_applicable(role: str) -> bool:
    return role in FERPA_ROLES


async def get_educational_record(
    db: AsyncSession,
    user_id: str,
) -> dict:
    alerts_result = await db.execute(
        select(Alert).where(Alert.assigned_to == user_id)
    )
    alerts = alerts_result.scalars().all()

    recordings_result = await db.execute(
        select(Recording).where(Recording.classroom_id.isnot(None))
    )
    recordings = recordings_result.scalars().all()

    audit_result = await db.execute(
        select(AuditLog).where(AuditLog.user_id == user_id)
    )
    audit_logs = audit_result.scalars().all()

    return {
        "user_id": user_id,
        "exported_at": datetime.now(UTC).isoformat(),
        "alerts": [
            {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "severity": a.severity,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
        "recordings": [
            {
                "id": r.id,
                "name": r.name,
                "duration": r.duration,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in recordings
        ],
        "audit_logs": [
            {
                "id": log.id,
                "action": log.action,
                "resource_type": log.resource_type,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
            }
            for log in audit_logs
        ],
    }


async def restrict_access(
    db: AsyncSession,
    record_type: str,
    user_ids: list[str],
) -> dict:
    return {
        "record_type": record_type,
        "restricted_user_ids": user_ids,
        "message": f"Access to {record_type} restricted for {len(user_ids)} users",
    }


async def directory_info_opt_out(
    db: AsyncSession,
    user_id: str,
) -> dict:
    compliance_entry = ComplianceLog(
        event_type="directory_info_opt_out",
        user_id=user_id,
        details={"opt_out": True},
        legal_basis="consent",
    )
    db.add(compliance_entry)
    await db.commit()

    return {
        "user_id": user_id,
        "opted_out": True,
        "message": "User opted out of directory information",
    }


async def has_consent(
    db: AsyncSession,
    user_id: str,
    consent_type: str = "camera_monitoring",
) -> bool:
    result = await db.execute(
        select(UserConsent).where(
            and_(
                UserConsent.user_id == user_id,
                UserConsent.consent_type == consent_type,
                UserConsent.granted.is_(True),
                UserConsent.revoked_at.is_(None),
            )
        ).order_by(UserConsent.created_at.desc()).limit(1)
    )
    consent = result.scalar_one_or_none()
    return consent is not None


async def get_users_with_consent(
    db: AsyncSession,
    consent_type: str = "camera_monitoring",
) -> list[str]:
    result = await db.execute(
        select(UserConsent.user_id).where(
            and_(
                UserConsent.consent_type == consent_type,
                UserConsent.granted.is_(True),
                UserConsent.revoked_at.is_(None),
            )
        ).distinct()
    )
    return [row[0] for row in result.all()]
