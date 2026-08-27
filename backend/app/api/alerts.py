from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime

from backend.app.api.dependencies import get_db, get_current_user, require_permission
from backend.app.core.audit import log_audit
from backend.app.core.websocket import manager
from backend.app.models.alert import Alert
from backend.app.models.classroom import Classroom
from backend.app.models.camera import Camera
from backend.app.schemas.alert import (
    AlertResponse,
    AlertCreate,
    AlertAcknowledge,
    AlertResolve,
    AlertAssign,
)
from backend.app.api.notifications import send_push_notification
from backend.app.models.push_token import PushToken

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


@router.post("", response_model=AlertResponse, status_code=201)
async def create_alert(
    request: Request,
    body: AlertCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:write")),
):
    alert = Alert(
        title=body.title,
        description=body.description,
        severity=body.severity,
        status=body.status,
        classroom_id=body.classroom_id,
        camera_id=body.camera_id,
        event_id=body.event_id,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)

    try:
        result = await db.execute(
            select(PushToken.token).where(PushToken.is_active == True)
        )
        tokens = [row[0] for row in result.all()]
        for token in tokens:
            await send_push_notification(
                token=token,
                title=alert.title,
                body=alert.description,
                data={"alert_id": alert.id, "severity": alert.severity},
            )
    except Exception:
        pass

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

    try:
        from backend.app.core.webhook_dispatcher import dispatch_event
        await dispatch_event("alert.created", {
            "id": str(alert.id),
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "status": alert.status,
            "classroom_id": str(alert.classroom_id) if alert.classroom_id else None,
            "camera_id": str(alert.camera_id) if alert.camera_id else None,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        })
    except Exception:
        pass

    return alert


def _enrich_alert(alert, classroom_name=None, camera_name=None):
    alert.classroom_name = classroom_name
    alert.camera_name = camera_name
    return alert


@router.get("", response_model=list[AlertResponse])
async def list_alerts(
    status: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    classroom_id: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:read")),
):
    query = (
        select(Alert, Classroom.name.label("c_name"), Camera.name.label("cam_name"))
        .join(Classroom, Alert.classroom_id == Classroom.id, isouter=True)
        .join(Camera, Alert.camera_id == Camera.id, isouter=True)
        .order_by(Alert.created_at.desc())
    )
    if status:
        query = query.where(Alert.status == status)
    if severity:
        query = query.where(Alert.severity == severity)
    if classroom_id:
        query = query.where(Alert.classroom_id == classroom_id)
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()
    return [_enrich_alert(row[0], row.c_name, row.cam_name) for row in rows]


@router.get("/count")
async def alert_counts(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:read")),
):
    total = await db.scalar(select(func.count()).select_from(Alert))
    active = await db.scalar(
        select(func.count()).select_from(Alert).where(Alert.status == "active")
    )
    return {"total": total or 0, "active": active or 0}


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:read")),
):
    query = (
        select(Alert, Classroom.name.label("c_name"), Camera.name.label("cam_name"))
        .join(Classroom, Alert.classroom_id == Classroom.id, isouter=True)
        .join(Camera, Alert.camera_id == Camera.id, isouter=True)
        .where(Alert.id == alert_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    return _enrich_alert(row[0], row.c_name, row.cam_name)


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:manage")),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    old_status = alert.status
    alert.status = "acknowledged"
    alert.acknowledged_at = datetime.utcnow()
    alert.acknowledged_by = _user.id
    await log_audit(
        db, _user, "acknowledge", "alert",
        resource_id=alert_id,
        old_value={"status": old_status},
        new_value={"status": "acknowledged"},
        request=request,
    )
    await db.commit()
    await db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:manage")),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    old_status = alert.status
    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    alert.resolved_by = _user.id
    await log_audit(
        db, _user, "resolve", "alert",
        resource_id=alert_id,
        old_value={"status": old_status},
        new_value={"status": "resolved"},
        request=request,
    )
    await db.commit()
    await db.refresh(alert)

    try:
        from backend.app.core.webhook_dispatcher import dispatch_event
        await dispatch_event("alert.resolved", {
            "id": str(alert.id),
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity,
            "status": alert.status,
            "classroom_id": str(alert.classroom_id) if alert.classroom_id else None,
            "camera_id": str(alert.camera_id) if alert.camera_id else None,
            "resolved_at": alert.resolved_at.isoformat() if alert.resolved_at else None,
        })
    except Exception:
        pass

    return alert


@router.post("/{alert_id}/assign", response_model=AlertResponse)
async def assign_alert(
    alert_id: str,
    request: Request,
    body: AlertAssign,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:manage")),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    old_assigned = alert.assigned_to
    alert.assigned_to = body.assigned_to
    await log_audit(
        db, _user, "assign", "alert",
        resource_id=alert_id,
        old_value={"assigned_to": old_assigned},
        new_value={"assigned_to": body.assigned_to},
        request=request,
    )
    await db.commit()
    await db.refresh(alert)
    return alert
