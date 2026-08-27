from __future__ import annotations

import logging
import os
import shutil
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.alert import Alert
from backend.app.models.audit_log import AuditLog
from backend.app.models.compliance_log import ComplianceLog
from backend.app.models.recording import Recording
from backend.app.models.retention_policy import RetentionPolicy
from backend.app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

DEFAULT_POLICIES = [
    {"resource_type": "evidence", "retention_days": 90, "auto_delete": False},
    {"resource_type": "recordings", "retention_days": 30, "auto_delete": False},
    {"resource_type": "alerts", "retention_days": 365, "auto_delete": False},
    {"resource_type": "audit_logs", "retention_days": 2555, "auto_delete": False},
]

_RESOURCE_MODELS = {
    "recordings": Recording,
    "alerts": Alert,
    "audit_logs": AuditLog,
}


async def ensure_default_policies(
    db: AsyncSession,
    organization_id: Optional[str] = None,
) -> list[RetentionPolicy]:
    existing = await db.execute(
        select(RetentionPolicy).where(
            RetentionPolicy.organization_id == organization_id,
            RetentionPolicy.is_active.is_(True),
        )
    )
    existing_types = {p.resource_type for p in existing.scalars().all()}

    created = []
    for policy_def in DEFAULT_POLICIES:
        if policy_def["resource_type"] not in existing_types:
            policy = RetentionPolicy(
                organization_id=organization_id,
                resource_type=policy_def["resource_type"],
                retention_days=policy_def["retention_days"],
                auto_delete=policy_def["auto_delete"],
            )
            db.add(policy)
            created.append(policy)

    if created:
        await db.commit()
    return created


async def get_policies(
    db: AsyncSession,
    organization_id: Optional[str] = None,
) -> list[RetentionPolicy]:
    query = select(RetentionPolicy).where(RetentionPolicy.is_active.is_(True))
    if organization_id:
        query = query.where(RetentionPolicy.organization_id == organization_id)
    result = await db.execute(query.order_by(RetentionPolicy.resource_type))
    return list(result.scalars().all())


async def check_expired_resources(
    db: AsyncSession,
    organization_id: Optional[str] = None,
) -> dict[str, list[dict]]:
    policies = await get_policies(db, organization_id)
    expired: dict[str, list[dict]] = {}

    for policy in policies:
        cutoff = datetime.now(timezone.utc) - timedelta(days=policy.retention_days)
        model = _RESOURCE_MODELS.get(policy.resource_type)
        if model is None:
            continue

        timestamp_col = getattr(model, "created_at", None) or getattr(model, "timestamp", None)
        if timestamp_col is None:
            continue

        result = await db.execute(
            select(model.id, timestamp_col).where(timestamp_col < cutoff).limit(1000)
        )
        rows = result.all()
        if rows:
            expired[policy.resource_type] = [
                {"id": row[0], "timestamp": row[1].isoformat() if row[1] else None}
                for row in rows
            ]

    return expired


async def delete_expired(
    db: AsyncSession,
    organization_id: Optional[str] = None,
    dry_run: bool = True,
    storage_path: Optional[str] = None,
) -> dict:
    storage = storage_path or os.environ.get("STORAGE_PATH", "./storage")
    policies = await get_policies(db, organization_id)
    summary: dict[str, int] = {}

    for policy in policies:
        if not policy.auto_delete:
            continue

        cutoff = datetime.now(timezone.utc) - timedelta(days=policy.retention_days)
        model = _RESOURCE_MODELS.get(policy.resource_type)
        if model is None:
            continue

        timestamp_col = getattr(model, "created_at", None) or getattr(model, "timestamp", None)
        if timestamp_col is None:
            continue

        result = await db.execute(
            select(model).where(timestamp_col < cutoff).limit(500)
        )
        records = list(result.scalars().all())

        deleted_count = 0
        for record in records:
            if dry_run:
                deleted_count += 1
                continue

            if policy.archive_before_delete and policy.archive_location:
                _archive_file(record, policy.archive_location, policy.resource_type)

            _delete_related_files(record, policy.resource_type, storage)
            await db.delete(record)
            deleted_count += 1

        summary[policy.resource_type] = deleted_count

    if not dry_run and summary:
        await db.commit()
        compliance_entry = ComplianceLog(
            organization_id=organization_id,
            event_type="data_deletion",
            details={"deleted_counts": summary, "dry_run": False},
            legal_basis="legal_obligation",
        )
        db.add(compliance_entry)
        await db.commit()

    return {"dry_run": dry_run, "deleted": summary}


def _delete_related_files(record, resource_type: str, storage: str) -> None:
    if resource_type == "recordings":
        file_path = getattr(record, "file_path", None)
        if file_path and os.path.isfile(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
    elif resource_type == "evidence":
        frame_url = getattr(record, "frame_url", None)
        if frame_url:
            fpath = os.path.join(storage, frame_url)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    pass


def _archive_file(record, archive_location: str, resource_type: str) -> None:
    if resource_type == "recordings":
        file_path = getattr(record, "file_path", None)
        if file_path and os.path.isfile(file_path):
            os.makedirs(archive_location, exist_ok=True)
            try:
                shutil.move(file_path, archive_location)
            except OSError:
                pass
