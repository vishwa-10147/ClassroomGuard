from datetime import datetime

from pydantic import BaseModel, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class RecordingResponse(BaseModel):
    id: str
    name: str
    filename: str
    file_path: str | None = None
    classroom_id: str | None = None
    classroom_name: str | None = None
    camera_id: str | None = None
    camera_name: str | None = None
    status: str = Field(default="queued", validation_alias="processing_state")
    progress: int = Field(default=0, validation_alias="processing_progress")
    duration: float = 0
    file_size: int = 0
    start_time: datetime | None = None
    end_time: datetime | None = None
    current_frame: int = 0
    total_frames: int = 0
    phase: str | None = None
    detection_count: int = 0
    event_count: int = 0
    error: str | None = None
    error_message: str | None = None
    uploaded_at: datetime
    processed_at: datetime | None = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class RecordingListResponse(BaseModel):
    data: list[RecordingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }
