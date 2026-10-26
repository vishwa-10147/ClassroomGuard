import time
from datetime import UTC, datetime
from uuid import uuid4

import cv2
import numpy as np
from backend.app.api.dependencies import get_db, require_permission, require_permission_or_service
from backend.app.core.audit import log_audit
from backend.app.core.limits import check_camera_limit
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.organization import Organization
from backend.app.models.user import User
from backend.app.schemas.camera import (
    CameraCreate,
    CameraResponse,
    CameraUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

router = APIRouter(
    prefix="/api/v1/cameras",
    tags=["Cameras"],
)


@router.get(
    "",
    response_model=list[CameraResponse],
)
async def list_cameras(
    current_user: User = Depends(
        require_permission("cameras:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    query = select(Camera).where(Camera.organization_id == org_id)
    result = await db.execute(query.order_by(Camera.name))
    return result.scalars().all()


@router.get(
    "/{camera_id}",
    response_model=CameraResponse,
)
async def get_camera(
    camera_id: str,
    current_user: User | None = Depends(
        require_permission_or_service("cameras:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    query = select(Camera).where(Camera.id == camera_id)
    if current_user is not None:  # None = AI service token
        query = query.where(Camera.organization_id == current_user.organization_id)
    else:
        # The AI config names cameras by the Camera ID staff typed in the web app
        query = select(Camera).where(or_(Camera.id == camera_id, Camera.camera_id == camera_id))
    result = await db.execute(query)

    camera = result.scalar_one_or_none()

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Camera not found",
        )

    org_id = current_user.organization_id if current_user else None
    if current_user is not None and (not org_id or camera.organization_id != org_id):
        raise HTTPException(status_code=404, detail="Camera not found")

    return camera


@router.post(
    "",
    response_model=CameraResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_camera(
    request: Request,
    camera_data: CameraCreate,
    current_user: User = Depends(
        require_permission("cameras:write")
    ),
    db: AsyncSession = Depends(get_db),
):
    org_id = current_user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")

    if org_id:
        org_result = await db.execute(
            select(Organization).where(Organization.id == org_id)
        )
        org = org_result.scalar_one_or_none()
        if org:
            camera_count = await db.scalar(
                select(__import__("sqlalchemy", fromlist=["func"]).func.count())
                .select_from(Camera)
                .where(Camera.organization_id == org_id)
            ) or 0
            check_camera_limit(org.plan, camera_count)

    classroom_result = await db.execute(
        select(Classroom).where(
            Classroom.id == camera_data.classroom_id,
            Classroom.organization_id == org_id,
        )
    )

    classroom = classroom_result.scalar_one_or_none()

    if classroom is None:
        raise HTTPException(
            status_code=404,
            detail="Classroom not found",
        )

    existing_result = await db.execute(
        select(Camera).where(
            Camera.camera_id == camera_data.camera_id,
            Camera.organization_id == org_id,
        )
    )

    existing_camera = existing_result.scalar_one_or_none()

    if existing_camera is not None:
        raise HTTPException(
            status_code=409,
            detail="Camera ID already exists",
        )

    camera = Camera(
        id=str(uuid4()),
        name=camera_data.name,
        camera_id=camera_data.camera_id,
        classroom_id=camera_data.classroom_id,
        status=camera_data.status,
        stream_url=camera_data.stream_url,
        fps=camera_data.fps,
        resolution=camera_data.resolution,
        ai_processing=camera_data.ai_processing,
        ai_model=camera_data.ai_model,
        organization_id=org_id,
    )

    db.add(camera)
    await log_audit(
        db, current_user, "create", "camera",
        new_value={"name": camera.name, "camera_id": camera.camera_id, "classroom_id": camera.classroom_id},
        request=request,
    )
    await db.commit()
    await db.refresh(camera)

    return camera


@router.patch(
    "/{camera_id}",
    response_model=CameraResponse,
)
async def update_camera(
    camera_id: str,
    request: Request,
    camera_data: CameraUpdate,
    current_user: User = Depends(
        require_permission("cameras:write")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Camera).where(
            Camera.id == camera_id,
            Camera.organization_id == current_user.organization_id,
        )
    )

    camera = result.scalar_one_or_none()

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Camera not found",
        )

    updates = camera_data.model_dump(exclude_unset=True)
    if "zones" in updates:
        labels = [z["label"].strip().lower() for z in updates["zones"] or [] if z["type"] == "seat"]
        if len(labels) != len(set(labels)):
            raise HTTPException(status_code=422, detail="Seat labels must be unique on a camera")
        if len({z["id"] for z in updates["zones"] or []}) != len(updates["zones"] or []):
            raise HTTPException(status_code=422, detail="Zone ids must be unique")

    if "classroom_id" in updates:
        classroom_result = await db.execute(
            select(Classroom).where(
                Classroom.id == updates["classroom_id"],
                Classroom.organization_id == current_user.organization_id,
            )
        )

        classroom = classroom_result.scalar_one_or_none()

        if classroom is None:
            raise HTTPException(
                status_code=404,
                detail="Classroom not found",
            )

    old_data = {
        "name": camera.name, "status": camera.status, "stream_url": camera.stream_url,
        "zones": len(camera.zones or []),
    }

    for key, value in updates.items():
        setattr(camera, key, value)

    camera.updated_at = datetime.now(UTC)

    await log_audit(
        db, current_user, "update", "camera",
        resource_id=camera_id,
        old_value=old_data,
        # A hall's zones run to several kilobytes; the audit log keeps how many there are
        new_value={**updates, "zones": len(updates["zones"] or [])} if "zones" in updates else updates,
        request=request,
    )
    await db.commit()
    await db.refresh(camera)

    return camera

@router.post(
    "/{camera_id}/test",
)
async def test_camera_connection(
    camera_id: str,
    current_user: User = Depends(
        require_permission("cameras:write")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Camera).where(
            Camera.id == camera_id,
            Camera.organization_id == current_user.organization_id,
        )
    )

    camera = result.scalar_one_or_none()

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Camera not found",
        )

    if not camera.stream_url:
        return {
            "success": False,
            "message": "Camera has no stream URL configured",
            "camera_id": camera.camera_id,
            "status": camera.status,
        }

    try:
        opened, frame = await run_in_threadpool(_grab_frame, camera.stream_url)

        if not opened:
            return {
                "success": False,
                # never echo the URL: RTSP URLs usually embed camera credentials
                "message": "Could not open the camera stream",
                "camera_id": camera.camera_id,
                "status": "offline",
            }

        if frame is None:
            return {
                "success": False,
                "message": "Stream opened but could not read a frame",
                "camera_id": camera.camera_id,
                "status": "offline",
            }

        h, w = frame.shape[:2]
        return {
            "success": True,
            "message": f"Stream OK — {w}x{h}",
            "camera_id": camera.camera_id,
            "status": "online",
            "resolution": f"{w}x{h}",
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection error: {type(e).__name__}",
            "camera_id": camera.camera_id,
            "status": "offline",
        }


CAPTURE_TIMEOUT_MS = 5000


def _open_capture(stream_url: str) -> cv2.VideoCapture:
    """Open a stream with bounded connect/read timeouts (an offline camera must not hang a request)."""
    cap = cv2.VideoCapture(
        stream_url,
        cv2.CAP_FFMPEG,
        [cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, CAPTURE_TIMEOUT_MS, cv2.CAP_PROP_READ_TIMEOUT_MSEC, CAPTURE_TIMEOUT_MS],
    )
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    return cap


def _grab_frame(stream_url: str) -> tuple[bool, np.ndarray | None]:
    """Blocking: returns (opened, frame or None). Call through run_in_threadpool."""
    cap = _open_capture(stream_url)
    try:
        if not cap.isOpened():
            return False, None
        ok, frame = cap.read()
        return True, frame if ok else None
    finally:
        cap.release()


def _mjpeg_gen(stream_url: str, max_fps: int = 15):
    """Yield MJPEG frames from an RTSP stream."""
    cap = _open_capture(stream_url)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    interval = 1.0 / max_fps

    try:
        while True:
            t0 = time.time()
            ok, frame = cap.read()
            if not ok or frame is None:
                cap.release()
                cap = _open_capture(stream_url)
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                ok, frame = cap.read()
                if not ok or frame is None:
                    break

            _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n'
                + jpeg.tobytes()
                + b'\r\n'
            )

            elapsed = time.time() - t0
            if elapsed < interval:
                time.sleep(interval - elapsed)
    finally:
        cap.release()


@router.get("/{camera_id}/stream")
async def camera_stream(
    camera_id: str,
    current_user: User = Depends(
        require_permission("cameras:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    """MJPEG proxy — streams the RTSP feed as multipart/x-mixed-replace."""
    result = await db.execute(
        select(Camera).where(
            Camera.id == camera_id,
            Camera.organization_id == current_user.organization_id,
        )
    )
    camera = result.scalar_one_or_none()

    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")

    if not camera.stream_url:
        raise HTTPException(status_code=400, detail="No stream URL configured for this camera")

    return StreamingResponse(
        _mjpeg_gen(camera.stream_url, max_fps=15),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )


@router.get("/{camera_id}/snapshot")
async def camera_snapshot(
    camera_id: str,
    current_user: User = Depends(
        require_permission("cameras:read")
    ),
    db: AsyncSession = Depends(get_db),
):
    """Return a single JPEG frame from the RTSP stream."""
    result = await db.execute(
        select(Camera).where(
            Camera.id == camera_id,
            Camera.organization_id == current_user.organization_id,
        )
    )
    camera = result.scalar_one_or_none()

    if camera is None:
        raise HTTPException(status_code=404, detail="Camera not found")

    if not camera.stream_url:
        raise HTTPException(status_code=400, detail="No stream URL configured")

    try:
        _, frame = await run_in_threadpool(_grab_frame, camera.stream_url)

        if frame is None:
            raise HTTPException(status_code=503, detail="Could not read frame from stream")

        _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return Response(content=jpeg.tobytes(), media_type="image/jpeg")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail="Stream error") from e

@router.delete(
    "/{camera_id}",
)
async def delete_camera(
    camera_id: str,
    request: Request,
    current_user: User = Depends(
        require_permission("cameras:delete")
    ),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Camera).where(
            Camera.id == camera_id,
            Camera.organization_id == current_user.organization_id,
        )
    )

    camera = result.scalar_one_or_none()

    if camera is None:
        raise HTTPException(
            status_code=404,
            detail="Camera not found",
        )

    await log_audit(
        db, current_user, "delete", "camera",
        resource_id=camera_id,
        old_value={"name": camera.name, "camera_id": camera.camera_id, "classroom_id": camera.classroom_id},
        request=request,
    )
    await db.delete(camera)
    await db.commit()

    return {
        "message": "Camera deleted successfully",
        "id": camera_id,
    }
