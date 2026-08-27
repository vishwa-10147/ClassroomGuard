import os
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, Response

from backend.app.api.dependencies import require_permission
from backend.app.core.config import settings
from backend.app.core.sanitization import sanitize_filename
from backend.app.models.user import User

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB


def _upload_dir() -> Path:
    base = Path(settings.storage_path)
    upload_path = base / "uploads"
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


@router.post("/video")
async def upload_video(
    file: UploadFile,
    _user: User = Depends(require_permission("recordings:read")),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Supported: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    upload_dir = _upload_dir()
    safe_name = f"{uuid.uuid4().hex}_{sanitize_filename(file.filename)}"
    dest = upload_dir / safe_name

    written = 0
    try:
        with open(dest, "wb") as f:
            while chunk := await file.read(1024 * 1024):  # 1 MB chunks
                written += len(chunk)
                if written > MAX_FILE_SIZE:
                    f.close()
                    dest.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File exceeds 500 MB limit")
                f.write(chunk)
    except HTTPException:
        raise
    except Exception:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Failed to save file")

    return {
        "filename": safe_name,
        "original_name": file.filename,
        "size_bytes": written,
        "size_mb": round(written / (1024 * 1024), 2),
        "path": str(dest),
        "content_type": file.content_type,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/video/{filename}")
async def serve_video(
    filename: str,
    request: Request,
    _user: User = Depends(require_permission("recordings:read")),
):
    upload_dir = _upload_dir()
    file_path = upload_dir / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    ext = file_path.suffix.lower()
    media_types = {
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
    }
    content_type = media_types.get(ext, "application/octet-stream")
    file_size = file_path.stat().st_size

    range_header = request.headers.get("range")
    if range_header:
        range_start, range_end = 0, file_size - 1
        range_str = range_header.replace("bytes=", "")
        parts = range_str.split("-")
        if parts[0]:
            range_start = int(parts[0])
        if parts[1]:
            range_end = int(parts[1])

        range_end = min(range_end, file_size - 1)
        content_length = range_end - range_start + 1

        with open(file_path, "rb") as f:
            f.seek(range_start)
            data = f.read(content_length)

        return Response(
            content=data,
            status_code=206,
            headers={
                "Content-Range": f"bytes {range_start}-{range_end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(content_length),
                "Content-Type": content_type,
            },
        )

    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=filename,
        headers={"Accept-Ranges": "bytes"},
    )


@router.get("/{filename}")
async def get_upload(
    filename: str,
    _user: User = Depends(require_permission("recordings:read")),
):
    upload_dir = _upload_dir()
    file_path = upload_dir / filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    ext = file_path.suffix.lower()
    media_types = {
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
    }

    return FileResponse(
        path=str(file_path),
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=filename,
    )
