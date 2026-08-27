from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class DetectionEventResponse(BaseModel):
    id: str
    type: str = Field(validation_alias="event_type")
    severity: str
    classroom_id: Optional[str] = None
    classroom_name: Optional[str] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    seat_id: Optional[str] = None
    confidence: Optional[float] = None
    tracker_id: Optional[int] = None
    frame_url: Optional[str] = None
    bounding_box: Optional[Any] = None
    metadata: Optional[Any] = Field(default=None, validation_alias="metadata_json")
    timestamp: datetime
    created_at: Optional[datetime] = None

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
    seat_id: Optional[str] = Field(default=None, validation_alias="seatId")
    confidence: Optional[float] = None
    tracker_id: Optional[int] = Field(default=None, validation_alias="trackerId")
    bounding_box: Optional[Any] = Field(default=None, validation_alias="boundingBox")
    metadata: Optional[Any] = None

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
