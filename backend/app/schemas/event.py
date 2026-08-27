from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class DetectionEventResponse(BaseModel):
    id: str
    type: str = Field(validation_alias="event_type")
    severity: str
    classroom_id: str | None = None
    classroom_name: str | None = None
    camera_id: str | None = None
    camera_name: str | None = None
    seat_id: str | None = None
    confidence: float | None = None
    tracker_id: int | None = None
    frame_url: str | None = None
    bounding_box: Any | None = None
    metadata: Any | None = Field(default=None, validation_alias="metadata_json")
    timestamp: datetime
    created_at: datetime | None = None

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class DetectionEventCreate(BaseModel):
    event_type: str = Field(validation_alias="eventType")
    severity: str
    classroom_id: str = Field(validation_alias="classroomId")
    camera_id: str = Field(validation_alias="cameraId")
    seat_id: str | None = Field(default=None, validation_alias="seatId")
    confidence: float | None = None
    tracker_id: int | None = Field(default=None, validation_alias="trackerId")
    bounding_box: Any | None = Field(default=None, validation_alias="boundingBox")
    metadata: Any | None = None

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class DetectionEventListResponse(BaseModel):
    data: list[DetectionEventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }
