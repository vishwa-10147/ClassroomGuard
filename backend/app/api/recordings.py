from datetime import UTC, datetime

from backend.app.api.dependencies import get_db, require_permission, require_service
from backend.app.api.uploads import delete_upload, save_upload, video_response
from backend.app.core.audit import log_audit
from backend.app.core.websocket import manager
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.recording import Recording
from backend.app.models.user import User
from backend.app.schemas.recording import (
    RecordingComplete,
    RecordingJob,
    RecordingListResponse,
    RecordingProgress,
    RecordingResponse,
)
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
)
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/recordings", tags=["Recordings"])


def _org_id(user: User) -> str:
    if not user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    return user.organization_id


async def _get_recording(db: AsyncSession, recording_id: str, organization_id: str | None) -> Recording:
    query = select(Recording).where(Recording.id == recording_id)
    if organization_id is not None:
        query = query.where(Recording.organization_id == organization_id)
    recording = (await db.execute(query)).scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording


async def _enrich(db: AsyncSession, recording: Recording) -> RecordingResponse:
    response = RecordingResponse.model_validate(recording)
    if recording.classroom_id:
        response.classroom_name = await db.scalar(select(Classroom.name).where(Classroom.id == recording.classroom_id))
    if recording.camera_id:
        response.camera_name = await db.scalar(select(Camera.name).where(Camera.id == recording.camera_id))
    return response


async def _broadcast(recording: Recording) -> None:
    """Live progress on the Recordings page."""
    await manager.broadcast({
        "type": "recording",
        "payload": {
            "id": recording.id,
            "status": recording.processing_state,
            "progress": recording.processing_progress,
            "phase": recording.phase,
            "detectionCount": recording.detection_count,
            "eventCount": recording.event_count,
        },
    }, recording.organization_id)


@router.get("", response_model=RecordingListResponse)
async def list_recordings(
    classroom_id: str | None = Query(None),
    camera_id: str | None = Query(None),
    processing_state: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:read")),
):
    conditions = [Recording.organization_id == _org_id(_user)]
    if classroom_id:
        conditions.append(Recording.classroom_id == classroom_id)
    if camera_id:
        conditions.append(Recording.camera_id == camera_id)
    if processing_state:
        conditions.append(Recording.processing_state == processing_state)

    total = await db.scalar(select(func.count()).select_from(Recording).where(*conditions)) or 0
    rows = (await db.execute(
        select(Recording, Classroom.name, Camera.name)
        .join(Classroom, Recording.classroom_id == Classroom.id, isouter=True)
        .join(Camera, Recording.camera_id == Camera.id, isouter=True)
        .where(*conditions)
        .order_by(desc(Recording.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )).all()

    data = []
    for recording, classroom_name, camera_name in rows:
        item = RecordingResponse.model_validate(recording)
        item.classroom_name = classroom_name
        item.camera_name = camera_name
        data.append(item)

    return RecordingListResponse(
        data=data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=RecordingResponse, status_code=201)
async def upload_recording(
    request: Request,
    file: UploadFile = File(...),
    camera_id: str = Form(..., alias="cameraId"),
    name: str | None = Form(None, max_length=255),
    analyze: bool = Form(True),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:write")),
):
    """Upload exam footage from a camera; it is queued for AI analysis unless analyze=false."""
    organization_id = _org_id(_user)
    camera = (await db.execute(
        select(Camera).where(Camera.id == camera_id, Camera.organization_id == organization_id)
    )).scalar_one_or_none()
    if camera is None:
        raise HTTPException(status_code=422, detail="Camera not found")

    filename, size = await save_upload(file)
    recording = Recording(
        name=(name or "").strip() or (file.filename or filename),
        filename=filename,
        file_path=f"uploads/{filename}",
        classroom_id=camera.classroom_id,
        camera_id=camera.id,
        file_size=size,
        processing_state="queued" if analyze else "completed",
        organization_id=organization_id,
    )
    db.add(recording)
    await log_audit(
        db, _user, "upload", "recording",
        new_value={"name": recording.name, "camera_id": camera.id, "size": size},
        request=request,
    )
    await db.commit()
    await db.refresh(recording)
    return await _enrich(db, recording)


# --- AI engine endpoints (X-Service-Token) -----------------------------------------------
# Declared before /{recording_id} so "claim" is not taken for an id.

@router.post("/claim", response_model=RecordingJob, responses={204: {"description": "Nothing queued"}})
async def claim_recording(
    db: AsyncSession = Depends(get_db),
    _service=Depends(require_service),
):
    """Hand the oldest queued recording to the calling AI engine and mark it processing."""
    recording = (await db.execute(
        select(Recording)
        .where(Recording.processing_state == "queued")
        .order_by(Recording.created_at)
        .limit(1)
        .with_for_update(skip_locked=True)
    )).scalar_one_or_none()
    if recording is None:
        return Response(status_code=204)

    recording.processing_state = "processing"
    recording.processing_progress = 0
    recording.current_frame = 0
    recording.detection_count = 0
    recording.event_count = 0
    recording.error_message = None
    recording.phase = "starting"
    camera = await db.get(Camera, recording.camera_id) if recording.camera_id else None
    await db.commit()
    await _broadcast(recording)
    return RecordingJob(
        id=recording.id,
        name=recording.name,
        filename=recording.filename,
        camera_id=recording.camera_id,
        camera_code=camera.camera_id if camera else None,
        zones=camera.zones if camera else None,
    )


@router.get("/{recording_id}/source")
async def download_source(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _service=Depends(require_service),
):
    """The video file, for AI engines that do not share the API's storage folder."""
    recording = await _get_recording(db, recording_id, None)
    return video_response(recording.filename, request, download=True)


@router.post("/{recording_id}/progress")
async def report_progress(
    recording_id: str,
    body: RecordingProgress,
    db: AsyncSession = Depends(get_db),
    _service=Depends(require_service),
):
    """Progress from the AI engine. The reply tells it whether staff cancelled the job."""
    recording = await _get_recording(db, recording_id, None)
    if recording.processing_state != "processing":
        return {"cancelled": True}
    recording.current_frame = body.current_frame
    recording.total_frames = body.total_frames
    if body.duration is not None:
        recording.duration = body.duration
    recording.phase = body.phase
    recording.detection_count = body.detection_count
    if body.total_frames:
        recording.processing_progress = min(99, round(100 * body.current_frame / body.total_frames))
    await db.commit()
    await _broadcast(recording)
    return {"cancelled": False}


@router.post("/{recording_id}/complete")
async def complete_recording(
    recording_id: str,
    body: RecordingComplete,
    db: AsyncSession = Depends(get_db),
    _service=Depends(require_service),
):
    recording = await _get_recording(db, recording_id, None)
    if recording.processing_state != "processing":
        return {"status": recording.processing_state}
    recording.processing_state = body.state
    recording.detection_count = body.detection_count
    recording.error_message = body.error_message if body.state == "failed" else None
    recording.phase = None
    if body.state == "completed":
        recording.processing_progress = 100
    recording.processed_at = datetime.now(UTC)
    await db.commit()
    await _broadcast(recording)
    return {"status": recording.processing_state}


# --- Staff endpoints ------------------------------------------------------------------

@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:read")),
):
    return await _enrich(db, await _get_recording(db, recording_id, _org_id(_user)))


@router.get("/{recording_id}/file")
async def recording_file(
    recording_id: str,
    request: Request,
    download: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:read")),
):
    """Play (Range requests) or download the video. Accepts ?token= for <video> elements."""
    recording = await _get_recording(db, recording_id, _org_id(_user))
    return video_response(recording.filename, request, download=download)


@router.post("/{recording_id}/process")
async def start_processing(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:write")),
):
    """Queue (or re-queue) a recording for AI analysis."""
    recording = await _get_recording(db, recording_id, _org_id(_user))
    if recording.processing_state in ("queued", "processing"):
        raise HTTPException(status_code=400, detail="Already queued or processing")
    recording.processing_state = "queued"
    recording.processing_progress = 0
    recording.error_message = None
    await log_audit(
        db, _user, "process", "recording",
        resource_id=recording_id,
        request=request,
    )
    await db.commit()
    await _broadcast(recording)
    return {"status": "started"}


@router.post("/{recording_id}/cancel")
async def cancel_processing(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:write")),
):
    recording = await _get_recording(db, recording_id, _org_id(_user))
    if recording.processing_state not in ("queued", "processing"):
        raise HTTPException(status_code=400, detail="Recording is not queued or processing")
    recording.processing_state = "cancelled"
    recording.phase = None
    await log_audit(
        db, _user, "cancel", "recording",
        resource_id=recording_id,
        request=request,
    )
    await db.commit()
    await _broadcast(recording)
    return {"status": "cancelled"}


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:delete")),
):
    recording = await _get_recording(db, recording_id, _org_id(_user))
    await log_audit(
        db, _user, "delete", "recording",
        resource_id=recording_id,
        old_value={"name": recording.name, "filename": recording.filename},
        request=request,
    )
    filename = recording.filename
    await db.delete(recording)
    await db.commit()
    delete_upload(filename)
    return {"status": "deleted"}
