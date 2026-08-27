
from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.detection_event import DetectionEvent
from backend.app.schemas.event import (
    DetectionEventCreate,
    DetectionEventListResponse,
    DetectionEventResponse,
)
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/events", tags=["Events"])


@router.post("", response_model=DetectionEventResponse, status_code=201)
async def create_event(
    body: DetectionEventCreate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:write")),
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

    event = DetectionEvent(
        event_type=body.event_type,
        severity=body.severity,
        classroom_id=body.classroom_id,
        camera_id=body.camera_id,
        seat_id=body.seat_id,
        confidence=body.confidence,
        tracker_id=body.tracker_id,
        bounding_box=body.bounding_box,
        metadata_json=metadata_json,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


def _enrich_event(event, classroom_name=None, camera_name=None):
    """Attach classroom_name/camera_name to an event ORM object for serialization."""
    event.classroom_name = classroom_name
    event.camera_name = camera_name
    return event


@router.get("", response_model=DetectionEventListResponse)
async def list_events(
    classroom_id: str | None = Query(None),
    camera_id: str | None = Query(None),
    type: str | None = Query(None),
    severity: str | None = Query(None),
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
        .where(DetectionEvent.id == event_id)
    )
    result = await db.execute(query)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Event not found")
    return _enrich_event(row[0], row.c_name, row.cam_name)
