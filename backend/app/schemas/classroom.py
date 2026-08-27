from datetime import datetime

from pydantic import BaseModel, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class ClassroomCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    building: str = Field(min_length=1, max_length=120)
    floor: int
    room_number: str = Field(min_length=1, max_length=30)
    total_seats: int = Field(ge=1)

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class ClassroomUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    building: str | None = Field(default=None, min_length=1, max_length=120)
    floor: int | None = None
    room_number: str | None = Field(default=None, min_length=1, max_length=30)
    total_seats: int | None = Field(default=None, ge=1)

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class ClassroomResponse(BaseModel):
    id: str
    name: str
    building: str
    floor: int
    room_number: str
    total_seats: int
    camera_id: str | None = None
    camera_name: str | None = None
    camera_status: str | None = None
    occupied_seats: int = 0
    occupancy: float | None = None
    active_detections: int = 0
    last_event_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }
