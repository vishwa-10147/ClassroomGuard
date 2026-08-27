from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, func, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.dependencies import get_db, get_current_user, require_permission
from backend.app.core.audit import log_audit, get_client_ip
from backend.app.models.alert import Alert
from backend.app.models.audit_log import AuditLog
from backend.app.models.compliance_log import ComplianceLog
from backend.app.models.consent import UserConsent
from backend.app.models.detection_event import DetectionEvent
from backend.app.models.recording import Recording
from backend.app.models.retention_policy import RetentionPolicy
from backend.app.models.user import User
from backend.app.schemas.compliance import (
    ConsentCreate,
    ConsentResponse,
    ComplianceLogResponse,
    DataRequestCreate,
    DataRequestResponse,
    DataSummaryResponse,
    RetentionPolicyResponse,
    RetentionPolicyUpdate,
    UserErasureResponse,
)
from backend.app.services.retention_service import get_policies, check_expired_resources, delete_expired

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/compliance", tags=["Compliance"])


@router.post("/data-request", response_model=DataRequestResponse, status_code=201)
async def create_data_request(
    request: Request,
    body: DataRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("audit_logs:read")),
):
    entry = ComplianceLog(
        event_type="data_export",
        user_id=current_user.id,
        details={
            "target_user_id": body.user_id or current_user.id,
            "request_type": body.request_type,
        },
        ip_address=get_client_ip(request),
        legal_basis="consent",
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    try:
        from backend.app.tasks.compliance_tasks import compile_user_data_export
        target_user_id = body.user_id or current_user.id
        compile_user_data_export.delay(target_user_id, None)
    except Exception:
        logger.warning("Could not dispatch data export task", exc_info=True)

    return DataRequestResponse(
        request_id=entry.id,
        status="pending",
        message="Data export request created. You will be notified when ready.",
        created_at=entry.created_at.isoformat(),
    )


@router.get("/data-request/{request_id}/status", response_model=DataRequestResponse)
async def get_data_request_status(
    request_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("audit_logs:read")),
):
    result = await db.execute(
        select(ComplianceLog).where(
            ComplianceLog.id == request_id,
            ComplianceLog.event_type == "data_export",
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Data request not found")

    status = "completed" if entry.details and entry.details.get("file_path") else "pending"

    return DataRequestResponse(
        request_id=entry.id,
        status=status,
        message="Export ready" if status == "completed" else "Processing",
        created_at=entry.created_at.isoformat(),
    )


@router.post("/consent", response_model=ConsentResponse, status_code=201)
async def record_consent(
    request: Request,
    body: ConsentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    consent = UserConsent(
        user_id=current_user.id,
        consent_type=body.consent_type,
        granted=body.granted,
        granted_at=datetime.now(timezone.utc) if body.granted else None,
        revoked_at=datetime.now(timezone.utc) if not body.granted else None,
        ip_address=get_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.add(consent)

    entry = ComplianceLog(
        event_type="consent_given" if body.granted else "consent_withdrawn",
        user_id=current_user.id,
        details={
            "consent_type": body.consent_type,
            "granted": body.granted,
        },
        ip_address=get_client_ip(request),
        legal_basis="consent",
    )
    db.add(entry)

    await db.commit()
    await db.refresh(consent)
    return consent


@router.get("/consent", response_model=list[ConsentResponse])
async def list_consents(
    user_id: Optional[str] = Query(None, alias="userId"),
    consent_type: Optional[str] = Query(None, alias="consentType"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("audit_logs:read")),
):
    query = select(UserConsent)
    if user_id:
        query = query.where(UserConsent.user_id == user_id)
    if consent_type:
        query = query.where(UserConsent.consent_type == consent_type)
    query = query.order_by(UserConsent.created_at.desc()).limit(200)
    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete("/user-data/{user_id}", response_model=UserErasureResponse)
async def erase_user_data(
    user_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("users:delete")),
):
    entry = ComplianceLog(
        event_type="data_deletion",
        user_id=current_user.id,
        resource_type="user",
        resource_id=user_id,
        details={"target_user_id": user_id, "initiated_by": current_user.id},
        ip_address=get_client_ip(request),
        legal_basis="consent",
    )
    db.add(entry)

    await db.execute(delete(UserConsent).where(UserConsent.user_id == user_id))

    await db.execute(
        AuditLog.__table__.update()
        .where(AuditLog.user_id == user_id)
        .values(user_id="anonymized", user_name="anonymized")
    )

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.name = "Deleted User"
        user.email = f"deleted_{user.id}@anonymized.local"
        user.is_active = False
        user.status = "deleted"

    await db.commit()

    return UserErasureResponse(
        status="completed",
        message="User data has been erased and audit logs anonymized.",
        user_id=user_id,
    )


@router.get("/audit-trail", response_model=list[ComplianceLogResponse])
async def get_audit_trail(
    event_type: Optional[str] = Query(None, alias="eventType"),
    user_id: Optional[str] = Query(None, alias="userId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("audit_logs:read")),
):
    query = select(ComplianceLog)
    if event_type:
        query = query.where(ComplianceLog.event_type == event_type)
    if user_id:
        query = query.where(ComplianceLog.user_id == user_id)
    query = query.order_by(ComplianceLog.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/data-summary/{org_id}", response_model=DataSummaryResponse)
async def get_data_summary(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("settings:read")),
):
    evidence_count = await db.scalar(select(func.count()).select_from(DetectionEvent))
    recordings_count = await db.scalar(select(func.count()).select_from(Recording))
    alerts_count = await db.scalar(select(func.count()).select_from(Alert))
    audit_logs_count = await db.scalar(select(func.count()).select_from(AuditLog))
    users_count = await db.scalar(select(func.count()).select_from(User))
    consents_count = await db.scalar(
        select(func.count()).select_from(UserConsent).where(UserConsent.granted.is_(True))
    )

    storage_used = 0
    recordings_result = await db.execute(select(Recording.file_size))
    for row in recordings_result.all():
        storage_used += row[0] or 0

    return DataSummaryResponse(
        organization_id=org_id,
        evidence_count=evidence_count or 0,
        recordings_count=recordings_count or 0,
        alerts_count=alerts_count or 0,
        audit_logs_count=audit_logs_count or 0,
        users_count=users_count or 0,
        consents_count=consents_count or 0,
        storage_used_bytes=storage_used,
    )


@router.get("/retention-policies", response_model=list[RetentionPolicyResponse])
async def list_retention_policies(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("settings:read")),
):
    policies = await get_policies(db)
    return policies


@router.put("/retention-policies/{policy_id}", response_model=RetentionPolicyResponse)
async def update_retention_policy(
    policy_id: str,
    body: RetentionPolicyUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("settings:write")),
):
    result = await db.execute(
        select(RetentionPolicy).where(RetentionPolicy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if not policy:
        raise HTTPException(status_code=404, detail="Retention policy not found")

    if body.retention_days is not None:
        policy.retention_days = body.retention_days
    if body.auto_delete is not None:
        policy.auto_delete = body.auto_delete
    if body.archive_before_delete is not None:
        policy.archive_before_delete = body.archive_before_delete
    if body.archive_location is not None:
        policy.archive_location = body.archive_location

    await log_audit(
        db, current_user, "update", "retention_policy",
        resource_id=policy_id,
        new_value=body.model_dump(exclude_none=True),
        request=request,
    )

    await db.commit()
    await db.refresh(policy)
    return policy


@router.get("/retention-check")
async def check_retention(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("settings:read")),
):
    expired = await check_expired_resources(db)
    return {"expired_resources": expired}


@router.post("/retention-enforce")
async def enforce_retention(
    request: Request,
    dry_run: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_permission("settings:write")),
):
    result = await delete_expired(db, dry_run=dry_run)
    await log_audit(
        db, current_user, "enforce_retention", "retention_policy",
        new_value=result,
        request=request,
    )
    return result
