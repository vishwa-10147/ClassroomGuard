from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.audit_log import AuditLog
from backend.app.models.user import User
from backend.app.schemas.audit_log import (
    AuditLogCreate,
    AuditLogResponse,
)

router = APIRouter(prefix="/api/v1/audit-logs", tags=["Audit Logs"])


@router.get("", response_model=list[AuditLogResponse])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    user_id: Optional[str] = Query(None),
    user_name: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    _user: User = Depends(require_permission("audit_logs:read")),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc())

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if user_name:
        query = query.where(AuditLog.user_name.ilike(f"%{user_name}%"))
    if action:
        query = query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
    if start_date:
        query = query.where(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.where(AuditLog.timestamp <= end_date)

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/count")
async def audit_log_count(
    _user: User = Depends(require_permission("audit_logs:read")),
    db: AsyncSession = Depends(get_db),
):
    total = await db.scalar(select(func.count()).select_from(AuditLog))
    return {"total": total or 0}


@router.post("", response_model=AuditLogResponse, status_code=201)
async def create_audit_log(
    body: AuditLogCreate,
    _user: User = Depends(require_permission("audit_logs:write")),
    db: AsyncSession = Depends(get_db),
):
    log = AuditLog(
        user_id=body.user_id,
        user_name=body.user_name,
        action=body.action,
        resource_type=body.resource_type,
        resource_id=body.resource_id,
        details=body.details,
        ip_address=body.ip_address,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log
