from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

IncidentSeverity = Literal["critical", "high", "medium", "low", "info"]
IncidentStatus = Literal["open", "investigating", "resolved", "dismissed"]


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class IncidentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(max_length=2000)
    severity: IncidentSeverity = "medium"
    classroom_id: str | None = None
    camera_id: str | None = None
    assigned_to: str | None = None
    event_ids: list[str] | None = None
    # Escalating an alert: room, camera and detection event are copied from it
    alert_id: str | None = None

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class IncidentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    severity: IncidentSeverity | None = None
    status: IncidentStatus | None = None
    assigned_to: str | None = None

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class IncidentNoteCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class IncidentResponse(BaseModel):
    id: str
    title: str
    description: str
    severity: str
    status: str
    classroom_id: str | None = None
    classroom_name: str | None = None
    camera_id: str | None = None
    camera_name: str | None = None
    assigned_to: str | None = None
    assignee_name: str | None = None
    event_ids: Any | None = None
    evidence: Any | None = None
    evidence_count: int | None = None
    notes: Any | None = None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None = None

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class IncidentListResponse(BaseModel):
    data: list[IncidentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }
