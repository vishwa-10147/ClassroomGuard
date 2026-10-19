from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class CameraZone(BaseModel):
    """A rectangle on the camera view, in 0-1 fractions of the image width and height.

    seat: detections inside it are reported with this seat label.
    ignore: people inside it (the invigilator's desk, an aisle) are never flagged.
    """
    id: str = Field(min_length=1, max_length=50)
    type: Literal["seat", "ignore"]
    label: str = Field(default="", max_length=50)
    x: float = Field(ge=0, le=1)
    y: float = Field(ge=0, le=1)
    w: float = Field(gt=0, le=1)
    h: float = Field(gt=0, le=1)

    @model_validator(mode="after")
    def _inside_image(self):
        if self.x + self.w > 1.0001 or self.y + self.h > 1.0001:
            raise ValueError("zone must lie inside the image")
        if self.type == "seat" and not self.label.strip():
            raise ValueError("a seat zone needs a label")
        return self


class CameraCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    camera_id: str = Field(min_length=1, max_length=100)
    classroom_id: str
    status: str = "offline"
    stream_url: str | None = Field(default=None, max_length=1000)
    fps: int = Field(default=0, ge=0)
    resolution: str = Field(default="1920x1080", max_length=30)
    ai_processing: bool = False
    ai_model: str | None = Field(default=None, max_length=120)

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class CameraUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    classroom_id: str | None = None
    status: str | None = None
    stream_url: str | None = Field(default=None, max_length=1000)
    fps: int | None = Field(default=None, ge=0)
    resolution: str | None = Field(default=None, max_length=30)
    ai_processing: bool | None = None
    ai_model: str | None = Field(default=None, max_length=120)
    inference_ms: float | None = Field(default=None, ge=0)
    last_frame_at: datetime | None = None
    zones: list[CameraZone] | None = Field(default=None, max_length=300)

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class CameraResponse(BaseModel):
    id: str
    name: str
    camera_id: str
    classroom_id: str
    classroom_name: str | None = None
    status: str
    stream_url: str | None
    fps: int
    resolution: str
    ai_active: bool = False
    ai_processing: bool
    ai_model: str | None
    inference_ms: float | None
    last_frame_at: datetime | None
    zones: list[CameraZone] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }

    @model_validator(mode="after")
    def _set_ai_active(self):
        self.ai_active = self.ai_processing
        return self
