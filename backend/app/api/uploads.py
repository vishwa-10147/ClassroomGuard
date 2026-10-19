import uuid
from datetime import UTC, datetime
from pathlib import Path

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.config import settings
from backend.app.core.sanitization import sanitize_filename
from backend.app.models.recording import Recording
from backend.app.models.user import User
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])

ALLOWED_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv"}
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB
VIDEO_MEDIA_TYPES = {
    ".mp4": "video/mp4",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
}


def _upload_dir() -> Path:
    base = Path(settings.storage_path)
    upload_path = base / "uploads"
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def _safe_upload_path(upload_dir: Path, filename: str) -> Path:
    """Return a path below ``upload_dir`` or reject path traversal attempts."""
    if not filename or Path(filename).name != filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    try:
        base = upload_dir.resolve()
        candidate = (base / filename).resolve()
        candidate.relative_to(base)
    except (OSError, ValueError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename")
    return candidate


def _parse_range(range_header: str, file_size: int) -> tuple[int, int]:
    """Parse one RFC 9110 byte range and return inclusive bounds."""
    if file_size <= 0 or not range_header.startswith("bytes="):
        raise ValueError
    value = range_header[6:].strip()
    if "," in value or "-" not in value:
        raise ValueError
    start_text, end_text = value.split("-", 1)
    try:
        if not start_text:
            suffix_length = int(end_text)
            if suffix_length <= 0:
                raise ValueError
            return max(0, file_size - suffix_length), file_size - 1
        start = int(start_text)
        if start < 0 or start >= file_size:
            raise ValueError
        end = file_size - 1 if not end_text else int(end_text)
        if end < start:
            raise ValueError
        return start, min(end, file_size - 1)
    except (TypeError, ValueError):
        raise ValueError


async def save_upload(file: UploadFile) -> tuple[str, int]:
    """Stream an uploaded video to the uploads folder; returns (stored filename, size in bytes)."""
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
    return safe_name, written


def delete_upload(filename: str) -> None:
    try:
        _safe_upload_path(_upload_dir(), filename).unlink(missing_ok=True)
    except (HTTPException, OSError):
        pass


def video_response(filename: str, request: Request, download: bool = False) -> Response:
    """Serve an uploaded video, honouring a single HTTP Range so players can seek."""
    file_path = _safe_upload_path(_upload_dir(), filename)
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    content_type = VIDEO_MEDIA_TYPES.get(file_path.suffix.lower(), "application/octet-stream")
    file_size = file_path.stat().st_size

    range_header = request.headers.get("range")
    if range_header and not download:
        try:
            range_start, range_end = _parse_range(range_header, file_size)
        except ValueError:
            return Response(
                status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
                headers={"Content-Range": f"bytes */{file_size}"},
            )
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
        content_disposition_type="attachment" if download else "inline",
    )


async def _require_own_upload(db: AsyncSession, filename: str, user: User) -> None:
    """Uploaded videos are only served to staff of the organisation whose recording it is."""
    owned = await db.scalar(
        select(func.count()).select_from(Recording).where(
            Recording.filename == filename, Recording.organization_id == user.organization_id
        )
    )
    if not owned:
        raise HTTPException(status_code=404, detail="File not found")


@router.post("/video")
async def upload_video(
    file: UploadFile,
    _user: User = Depends(require_permission("recordings:write")),
):
    """Store a video without creating a recording. The web app uses POST /api/v1/recordings."""
    safe_name, written = await save_upload(file)
    return {
        "filename": safe_name,
        "original_name": file.filename,
        "size_bytes": written,
        "size_mb": round(written / (1024 * 1024), 2),
        "content_type": file.content_type,
        "uploaded_at": datetime.now(UTC).isoformat(),
    }


@router.get("/video/{filename}")
async def serve_video(
    filename: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("recordings:read")),
):
    _safe_upload_path(_upload_dir(), filename)
    await _require_own_upload(db, filename, _user)
    return video_response(filename, request)


@router.get("/{filename}")
async def get_upload(
    filename: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_permission("recordings:read")),
):
    _safe_upload_path(_upload_dir(), filename)
    await _require_own_upload(db, filename, _user)
    return video_response(filename, request, download=True)
