import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from backend.app.api.dependencies import require_permission
from backend.app.core.config import settings
from backend.app.models.user import User

router = APIRouter(prefix="/api/v1/evidence", tags=["Evidence"])

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def _frames_dir() -> Path:
    base = Path(settings.storage_path)
    d = base / "frames"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _evidence_dir() -> Path:
    base = Path(settings.storage_path)
    d = base / "evidence"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _scan_directory(directory: Path, source: str) -> list[dict]:
    items = []
    for file_path in sorted(directory.iterdir()):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        stat = file_path.stat()
        items.append({
            "filename": file_path.name,
            "url": f"/api/v1/evidence/frames/{file_path.name}",
            "size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
            "source": source,
        })
    return items


@router.get("/frames")
async def list_frames(
    _user: User = Depends(require_permission("recordings:read")),
):
    items = _scan_directory(_frames_dir(), "periodic")
    return {"items": items}


@router.get("/alerts")
async def list_alert_frames(
    _user: User = Depends(require_permission("recordings:read")),
):
    items = _scan_directory(_evidence_dir(), "alert")
    return {"items": items}


@router.get("/frames/{filename}")
async def serve_frame(
    filename: str,
    _user: User = Depends(require_permission("recordings:read")),
):
    frames_dir = _frames_dir()
    evidence_dir = _evidence_dir()

    file_path = frames_dir / filename
    if not file_path.exists() or not file_path.is_file():
        file_path = evidence_dir / filename
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="Frame not found")

    ext = file_path.suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }

    return FileResponse(
        path=str(file_path),
        media_type=media_types.get(ext, "application/octet-stream"),
    )
