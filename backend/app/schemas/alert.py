from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


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
    classroom_id: Optional[str] = None
    classroom_name: Optional[str] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    event_id: Optional[str] = None
    source_id: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    timestamp: Optional[datetime] = Field(default=None, validation_alias="created_at")
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
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
    classroom_id: Optional[str] = Field(default=None, validation_alias="classroomId")
    camera_id: Optional[str] = Field(default=None, validation_alias="cameraId")
    event_id: Optional[str] = Field(default=None, validation_alias="eventId")
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
