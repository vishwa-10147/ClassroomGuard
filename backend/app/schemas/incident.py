from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: str = "medium"
    classroom_id: Optional[str] = None
    camera_id: Optional[str] = None
    assigned_to: Optional[str] = None
    event_ids: Optional[Any] = None

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[Any] = None

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
    classroom_id: Optional[str] = None
    classroom_name: Optional[str] = None
    camera_id: Optional[str] = None
    camera_name: Optional[str] = None
    assigned_to: Optional[str] = None
    assignee_name: Optional[str] = None
    event_ids: Optional[Any] = None
    evidence: Optional[Any] = None
    evidence_count: Optional[int] = None
    notes: Optional[Any] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None

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
