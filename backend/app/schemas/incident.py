from datetime import datetime
from typing import Any

from pydantic import BaseModel


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str = "medium"
    classroom_id: str | None = None
    camera_id: str | None = None
    assigned_to: str | None = None
    event_ids: Any | None = None

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class IncidentUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: str | None = None
    status: str | None = None
    assigned_to: str | None = None
    notes: Any | None = None

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


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
