from datetime import UTC, datetime
from uuid import uuid4

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.models.alert import Alert
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.detection_event import DetectionEvent
from backend.app.models.incident import Incident
from backend.app.models.user import User
from backend.app.schemas.incident import (
    IncidentCreate,
    IncidentListResponse,
    IncidentNoteCreate,
    IncidentResponse,
    IncidentUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, func, or_, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

router = APIRouter(prefix="/api/v1/incidents", tags=["Incidents"])


def _org_id(user: User) -> str:
    if not user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    return user.organization_id


async def _get_incident(db: AsyncSession, incident_id: str, organization_id: str) -> Incident:
    incident = (await db.execute(
        select(Incident).where(Incident.id == incident_id, Incident.organization_id == organization_id)
    )).scalar_one_or_none()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


async def _require_in_org(db: AsyncSession, model, object_id: str | None, organization_id: str, label: str) -> None:
    """Reject references to rooms, cameras, users or events of another organization."""
    if object_id is None:
        return
    found = await db.scalar(
        select(func.count()).select_from(model).where(model.id == object_id, model.organization_id == organization_id)
    )
    if not found:
        raise HTTPException(status_code=422, detail=f"{label} not found")


async def _enrich(db: AsyncSession, incident: Incident) -> IncidentResponse:
    response = IncidentResponse.model_validate(incident)
    if incident.classroom_id:
        response.classroom_name = await db.scalar(select(Classroom.name).where(Classroom.id == incident.classroom_id))
    if incident.camera_id:
        response.camera_name = await db.scalar(select(Camera.name).where(Camera.id == incident.camera_id))
    if incident.assigned_to:
        response.assignee_name = await db.scalar(select(User.name).where(User.id == incident.assigned_to))
    response.evidence_count = len(incident.event_ids or [])
    return response


@router.get("", response_model=IncidentListResponse)
async def list_incidents(
    request: Request,
    status: str | None = Query(None),
    severity: str | None = Query(None),
    classroom_id: str | None = Query(None),
    q: str | None = Query(None, max_length=200, description="Search title and description"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:read")),
):
    conditions = [Incident.organization_id == _org_id(_user)]
    if status:
        conditions.append(Incident.status == status)
    if severity:
        conditions.append(Incident.severity == severity)
    if classroom_id:
        conditions.append(Incident.classroom_id == classroom_id)
    if q:
        pattern = f"%{q.strip()}%"
        conditions.append(or_(Incident.title.ilike(pattern), Incident.description.ilike(pattern)))

    total = await db.scalar(select(func.count()).select_from(Incident).where(*conditions)) or 0
    query = (
        select(Incident, Classroom.name, User.name)
        .join(Classroom, Incident.classroom_id == Classroom.id, isouter=True)
        .join(User, Incident.assigned_to == User.id, isouter=True)
        .where(*conditions)
        .order_by(desc(Incident.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    try:
        rows = (await db.execute(query)).all()
    except SQLAlchemyError:
        raise HTTPException(status_code=500, detail="Database error")

    data = []
    for incident, classroom_name, assignee_name in rows:
        item = IncidentResponse.model_validate(incident)
        item.classroom_name = classroom_name
        item.assignee_name = assignee_name
        item.evidence_count = len(incident.event_ids or [])
        data.append(item)

    return IncidentListResponse(
        data=data,
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
    return await _enrich(db, await _get_incident(db, incident_id, _org_id(_user)))


@router.post("", response_model=IncidentResponse)
async def create_incident(
    request: Request,
    body: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    organization_id = _org_id(_user)
    classroom_id, camera_id, event_ids = body.classroom_id, body.camera_id, list(body.event_ids or [])

    if body.alert_id:
        alert = (await db.execute(
            select(Alert).where(Alert.id == body.alert_id, Alert.organization_id == organization_id)
        )).scalar_one_or_none()
        if alert is None:
            raise HTTPException(status_code=422, detail="Alert not found")
        classroom_id = classroom_id or alert.classroom_id
        camera_id = camera_id or alert.camera_id
        if alert.event_id and alert.event_id not in event_ids:
            event_ids.append(alert.event_id)

    await _require_in_org(db, Classroom, classroom_id, organization_id, "Classroom")
    await _require_in_org(db, Camera, camera_id, organization_id, "Camera")
    await _require_in_org(db, User, body.assigned_to, organization_id, "Assignee")
    for event_id in event_ids:
        await _require_in_org(db, DetectionEvent, event_id, organization_id, "Detection event")

    incident = Incident(
        title=body.title,
        description=body.description,
        severity=body.severity,
        classroom_id=classroom_id,
        camera_id=camera_id,
        assigned_to=body.assigned_to,
        event_ids=event_ids or None,
        organization_id=organization_id,
    )
    db.add(incident)
    await log_audit(
        db, _user, "create", "incident",
        new_value={"title": incident.title, "severity": incident.severity, "alert_id": body.alert_id},
        request=request,
    )
    await db.commit()
    await db.refresh(incident)
    return await _enrich(db, incident)


@router.patch("/{incident_id}", response_model=IncidentResponse)
async def update_incident(
    incident_id: str,
    request: Request,
    body: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    organization_id = _org_id(_user)
    incident = await _get_incident(db, incident_id, organization_id)

    old_data = {
        "title": incident.title, "severity": incident.severity,
        "status": incident.status, "assigned_to": incident.assigned_to,
    }
    update_data = body.model_dump(exclude_unset=True)
    if "assigned_to" in update_data:
        await _require_in_org(db, User, update_data["assigned_to"], organization_id, "Assignee")
    for field, value in update_data.items():
        setattr(incident, field, value)

    if body.status == "resolved":
        incident.resolved_at = datetime.now(UTC)
    elif body.status is not None:
        incident.resolved_at = None

    await log_audit(
        db, _user, "update", "incident",
        resource_id=incident_id,
        old_value=old_data,
        new_value=update_data,
        request=request,
    )
    await db.commit()
    await db.refresh(incident)
    return await _enrich(db, incident)


@router.post("/{incident_id}/notes", response_model=IncidentResponse)
async def add_incident_note(
    incident_id: str,
    request: Request,
    body: IncidentNoteCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    """Append a note. The author and time come from the server, never from the client."""
    incident = await _get_incident(db, incident_id, _org_id(_user))
    note = {
        "id": str(uuid4()),
        "text": body.text.strip(),
        "author": _user.name,
        "authorId": _user.id,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    incident.notes = [*(incident.notes or []), note]
    flag_modified(incident, "notes")
    await log_audit(
        db, _user, "add_note", "incident",
        resource_id=incident_id,
        new_value={"note_id": note["id"]},
        request=request,
    )
    await db.commit()
    await db.refresh(incident)
    return await _enrich(db, incident)


@router.delete("/{incident_id}")
async def delete_incident(
    incident_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("incidents:write")),
):
    incident = await _get_incident(db, incident_id, _org_id(_user))
    await log_audit(
        db, _user, "delete", "incident",
        resource_id=incident_id,
        old_value={"title": incident.title, "severity": incident.severity},
        request=request,
    )
    await db.delete(incident)
    await db.commit()
    return {"status": "deleted"}
