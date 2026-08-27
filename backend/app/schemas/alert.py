from datetime import datetime

from pydantic import BaseModel, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class AlertResponse(BaseModel):
    id: str
    type: str = "SYSTEM_INFO"
    title: str
    description: str
    severity: str
    status: str
    classroom_id: str | None = None
    classroom_name: str | None = None
    camera_id: str | None = None
    camera_name: str | None = None
    event_id: str | None = None
    source_id: str | None = None
    assigned_to: str | None = None
    assigned_to_name: str | None = None
    timestamp: datetime | None = Field(default=None, validation_alias="created_at")
    acknowledged_at: datetime | None = None
    acknowledged_by: str | None = None
    resolved_at: datetime | None = None
    resolved_by: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class AlertCreate(BaseModel):
    title: str
    description: str
    severity: str
    status: str = "active"
    classroom_id: str | None = Field(default=None, validation_alias="classroomId")
    camera_id: str | None = Field(default=None, validation_alias="cameraId")
    event_id: str | None = Field(default=None, validation_alias="eventId")
    type: str = "SYSTEM_INFO"

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class AlertAcknowledge(BaseModel):
    acknowledged_by: str = "system"

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class AlertResolve(BaseModel):
    resolved_by: str = "system"

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class AlertAssign(BaseModel):
    assigned_to: str

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }
