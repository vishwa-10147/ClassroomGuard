from datetime import datetime

from backend.app.api.dependencies import get_db, require_permission, require_permission_or_service
from backend.app.core.websocket import manager
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.detection_event import DetectionEvent
from backend.app.models.recording import Recording
from backend.app.schemas.event import (
    DetectionEventCreate,
    DetectionEventListResponse,
    DetectionEventResponse,
)
from backend.app.services.alerting import ALERTING_SEVERITIES, EVENT_TITLES, create_alert_and_notify
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/events", tags=["Events"])


@router.post("", response_model=DetectionEventResponse, status_code=201)
async def create_event(
    body: DetectionEventCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission_or_service("alerts:write")),
):
    metadata_json = None
    if body.metadata is not None:
        if isinstance(body.metadata, str):
            import json as _json
            try:
                metadata_json = _json.loads(body.metadata)
            except _json.JSONDecodeError:
                metadata_json = {"raw": body.metadata}
        else:
            metadata_json = body.metadata

    # The AI engine may send the camera's internal id or the code staff gave it in the web app;
    # the classroom always comes from the camera so the two can never disagree.
    camera_query = select(Camera).where(
        or_(Camera.id == body.camera_id, Camera.camera_id == body.camera_id)
    )
    if _user is not None:
        camera_query = camera_query.where(Camera.organization_id == _user.organization_id)
    camera = (await db.execute(camera_query)).scalar_one_or_none()
    if camera is None:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown camera '{body.camera_id}'. Add it under Cameras and use its Camera ID in the AI config.",
        )

    recording = None
    if body.recording_id:
        recording = (await db.execute(
            select(Recording).where(
                Recording.id == body.recording_id,
                Recording.organization_id == camera.organization_id,
            )
        )).scalar_one_or_none()
        if recording is None:
            raise HTTPException(status_code=422, detail="Unknown recording")

    event = DetectionEvent(
        event_type=body.event_type,
        severity=body.severity,
        classroom_id=camera.classroom_id,
        camera_id=camera.id,
        organization_id=camera.organization_id,
        seat_id=body.seat_id,
        recording_id=recording.id if recording else None,
        confidence=body.confidence,
        tracker_id=body.tracker_id,
        bounding_box=body.bounding_box,
        metadata_json=metadata_json,
    )
    db.add(event)
    if recording is not None:
        recording.event_count += 1
    await db.commit()
    await db.refresh(event)

    # Found in uploaded footage: stored for review, but nothing is happening in the room now,
    # so there is no live notification or alert
    if recording is not None:
        return event

    classroom = await db.get(Classroom, camera.classroom_id)
    room = classroom.name if classroom else "unknown room"
    message = metadata_json.get("message") if isinstance(metadata_json, dict) else None
    await manager.broadcast({
        "type": "detection",
        "payload": {
            "id": event.id,
            "type": event.event_type,
            "severity": event.severity,
            "cameraName": camera.name,
            "classroomName": room,
            "message": message,
        },
    }, event.organization_id)

    # Cheating cues from the AI become alerts so invigilators are notified in real time
    if event.severity in ALERTING_SEVERITIES:
        title = EVENT_TITLES.get(event.event_type, event.event_type.replace("_", " ").capitalize())
        await create_alert_and_notify(
            db,
            title=f"{title} - {room}",
            description=f"{message or title} (camera: {camera.name})",
            severity=event.severity,
            classroom_id=camera.classroom_id,
            camera_id=camera.id,
            event_id=event.id,
            organization_id=camera.organization_id,
        )
    return event


def _enrich_event(event, classroom_name=None, camera_name=None):
    """Attach classroom_name/camera_name to an event ORM object for serialization."""
    event.classroom_name = classroom_name
    event.camera_name = camera_name
    return event


@router.get("", response_model=DetectionEventListResponse)
async def list_events(
    request: Request,
    classroom_id: str | None = Query(None),
    camera_id: str | None = Query(None),
    type: str | None = Query(None),
    severity: str | None = Query(None),
    since: datetime | None = Query(None, description="Only events at or after this time (ISO 8601)"),
    recording_id: str | None = Query(None),
    source: str | None = Query(None, pattern="^(live|recording)$"),
    q: str | None = Query(None, max_length=200, description="Search type, seat, camera and room"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("events:read")),
):
    base = (
        select(DetectionEvent, Classroom.name.label("c_name"), Camera.name.label("cam_name"))
        .join(Classroom, DetectionEvent.classroom_id == Classroom.id, isouter=True)
        .join(Camera, DetectionEvent.camera_id == Camera.id, isouter=True)
    )
    count_query = select(func.count()).select_from(DetectionEvent)
    if not _user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    base = base.where(DetectionEvent.organization_id == _user.organization_id)
    count_query = count_query.where(DetectionEvent.organization_id == _user.organization_id)

    if classroom_id:
        base = base.where(DetectionEvent.classroom_id == classroom_id)
        count_query = count_query.where(DetectionEvent.classroom_id == classroom_id)
    if camera_id:
        base = base.where(DetectionEvent.camera_id == camera_id)
        count_query = count_query.where(DetectionEvent.camera_id == camera_id)
    if type:
        base = base.where(DetectionEvent.event_type == type)
        count_query = count_query.where(DetectionEvent.event_type == type)
    if severity:
        base = base.where(DetectionEvent.severity == severity)
        count_query = count_query.where(DetectionEvent.severity == severity)
    if since:
        base = base.where(DetectionEvent.timestamp >= since)
        count_query = count_query.where(DetectionEvent.timestamp >= since)
    if recording_id:
        base = base.where(DetectionEvent.recording_id == recording_id)
        count_query = count_query.where(DetectionEvent.recording_id == recording_id)
    if source == "live":
        base = base.where(DetectionEvent.recording_id.is_(None))
        count_query = count_query.where(DetectionEvent.recording_id.is_(None))
    elif source == "recording":
        base = base.where(DetectionEvent.recording_id.is_not(None))
        count_query = count_query.where(DetectionEvent.recording_id.is_not(None))
    if q:
        pattern = f"%{q.strip()}%"
        match = or_(
            DetectionEvent.event_type.ilike(pattern.replace(" ", "_")),
            DetectionEvent.seat_id.ilike(pattern),
            Camera.name.ilike(pattern),
            Classroom.name.ilike(pattern),
        )
        base = base.where(match)
        count_query = (
            count_query
            .join(Classroom, DetectionEvent.classroom_id == Classroom.id, isouter=True)
            .join(Camera, DetectionEvent.camera_id == Camera.id, isouter=True)
            .where(match)
        )

    total = await db.scalar(count_query) or 0
    query = base.order_by(desc(DetectionEvent.timestamp)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    rows = result.all()
    events = [_enrich_event(row[0], row.c_name, row.cam_name) for row in rows]

    return DetectionEventListResponse(
        data=events,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/recent", response_model=list[DetectionEventResponse])
async def recent_events(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("events:read")),
):
    query = (
        select(DetectionEvent, Classroom.name.label("c_name"), Camera.name.label("cam_name"))
        .join(Classroom, DetectionEvent.classroom_id == Classroom.id, isouter=True)
        .join(Camera, DetectionEvent.camera_id == Camera.id, isouter=True)
        .order_by(desc(DetectionEvent.timestamp))
        .limit(limit)
    )
    if not _user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    query = query.where(DetectionEvent.organization_id == _user.organization_id)
    result = await db.execute(query)
    rows = result.all()
    return [_enrich_event(row[0], row.c_name, row.cam_name) for row in rows]


@router.get("/{event_id}", response_model=DetectionEventResponse)
async def get_event(
    event_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("events:read")),
):
    query = (
        select(DetectionEvent, Classroom.name.label("c_name"), Camera.name.label("cam_name"))
        .join(Classroom, DetectionEvent.classroom_id == Classroom.id, isouter=True)
        .join(Camera, DetectionEvent.camera_id == Camera.id, isouter=True)
        .where(
            DetectionEvent.id == event_id,
            DetectionEvent.organization_id == _user.organization_id,
        )
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    return _enrich_event(row[0], row.c_name, row.cam_name)
