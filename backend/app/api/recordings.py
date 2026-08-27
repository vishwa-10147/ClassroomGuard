
from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.models.recording import Recording
from backend.app.schemas.recording import RecordingListResponse, RecordingResponse
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/recordings", tags=["Recordings"])


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
    query = select(Recording).order_by(desc(Recording.created_at))
    count_query = select(func.count()).select_from(Recording)

    if classroom_id:
        query = query.where(Recording.classroom_id == classroom_id)
        count_query = count_query.where(Recording.classroom_id == classroom_id)
    if camera_id:
        query = query.where(Recording.camera_id == camera_id)
        count_query = count_query.where(Recording.camera_id == camera_id)
    if processing_state:
        query = query.where(Recording.processing_state == processing_state)
        count_query = count_query.where(Recording.processing_state == processing_state)

    total = await db.scalar(count_query) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    recordings = result.scalars().all()

    return RecordingListResponse(
        data=[RecordingResponse.model_validate(r) for r in recordings],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{recording_id}", response_model=RecordingResponse)
async def get_recording(
    recording_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:read")),
):
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    return recording


@router.post("/{recording_id}/process")
async def start_processing(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:read")),
):
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    if recording.processing_state == "processing":
        raise HTTPException(status_code=400, detail="Already processing")
    recording.processing_state = "processing"
    recording.processing_progress = 0
    await log_audit(
        db, _user, "process", "recording",
        resource_id=recording_id,
        request=request,
    )
    await db.commit()
    return {"status": "started"}


@router.post("/{recording_id}/cancel")
async def cancel_processing(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:read")),
):
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    recording.processing_state = "cancelled"
    await log_audit(
        db, _user, "cancel", "recording",
        resource_id=recording_id,
        request=request,
    )
    await db.commit()
    return {"status": "cancelled"}


@router.delete("/{recording_id}")
async def delete_recording(
    recording_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("recordings:delete")),
):
    result = await db.execute(
        select(Recording).where(Recording.id == recording_id)
    )
    recording = result.scalar_one_or_none()
    if not recording:
        raise HTTPException(status_code=404, detail="Recording not found")
    await log_audit(
        db, _user, "delete", "recording",
        resource_id=recording_id,
        old_value={"name": recording.name, "filename": recording.filename},
        request=request,
    )
    await db.delete(recording)
    await db.commit()
    return {"status": "deleted"}
