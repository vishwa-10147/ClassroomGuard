
from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.models.incident import Incident
from backend.app.schemas.incident import (
    IncidentCreate,
    IncidentListResponse,
    IncidentResponse,
    IncidentUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/incidents", tags=["Incidents"])


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    status: str | None = Query(None),
    severity: str | None = Query(None),
    classroom_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:read")),
):
    query = select(Incident).order_by(desc(Incident.created_at))
    count_query = select(func.count()).select_from(Incident)

    if status:
        query = query.where(Incident.status == status)
        count_query = count_query.where(Incident.status == status)
    if severity:
        query = query.where(Incident.severity == severity)
        count_query = count_query.where(Incident.severity == severity)
    if classroom_id:
        query = query.where(Incident.classroom_id == classroom_id)
        count_query = count_query.where(Incident.classroom_id == classroom_id)

    total = await db.scalar(count_query) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    incidents = result.scalars().all()

    return IncidentListResponse(
        data=[IncidentResponse.model_validate(i) for i in incidents],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:read")),
):
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("", response_model=IncidentResponse)
async def create_incident(
    request: Request,
    body: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    incident = Incident(
        title=body.title,
        description=body.description,
        severity=body.severity,
        classroom_id=body.classroom_id,
        camera_id=body.camera_id,
        assigned_to=body.assigned_to,
        event_ids=body.event_ids,
    )
    db.add(incident)
    await log_audit(
        db, _user, "create", "incident",
        new_value={"title": incident.title, "severity": incident.severity},
        request=request,
    )
    await db.commit()
    await db.refresh(incident)
    return incident


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    request: Request,
    body: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    old_data = {"title": incident.title, "severity": incident.severity, "status": incident.status}
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incident, field, value)

    if body.status == "resolved":
        from datetime import datetime
        incident.resolved_at = datetime.utcnow()

    await log_audit(
        db, _user, "update", "incident",
        resource_id=incident_id,
        old_value=old_data,
        new_value=update_data,
        request=request,
    )
    await db.commit()
    await db.refresh(incident)
    return incident


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    result = await db.execute(
        select(Incident).where(Incident.id == incident_id)
    )
    incident = result.scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    await log_audit(
        db, _user, "delete", "incident",
        resource_id=incident_id,
        old_value={"title": incident.title, "severity": incident.severity},
        request=request,
    )
    await db.delete(incident)
    await db.commit()
    return {"status": "deleted"}
