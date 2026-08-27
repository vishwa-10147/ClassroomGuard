from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class RecordingResponse(BaseModel):
    id: str
    name: str
    filename: str
    file_path: Optional[str] = None
    classroom_id: Optional[str] = None
    classroom_name: Optional[str] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    status: str = Field(default="queued", validation_alias="processing_state")
    progress: int = Field(default=0, validation_alias="processing_progress")
    duration: float = 0
    file_size: int = 0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    current_frame: int = 0
    total_frames: int = 0
    phase: Optional[str] = None
    detection_count: int = 0
    event_count: int = 0
    error: Optional[str] = None
    error_message: Optional[str] = None
    uploaded_at: datetime
    processed_at: Optional[datetime] = None
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
