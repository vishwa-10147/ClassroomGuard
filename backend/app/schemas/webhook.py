from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class WebhookCreate(BaseModel):
    name: str
    url: str
    secret: Optional[str] = None
    events: list[str] = Field(default_factory=list)
    headers: dict = Field(default_factory=dict)
    is_active: bool = True
    organization_id: Optional[str] = Field(default=None, validation_alias="organizationId")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    secret: Optional[str] = None
    events: Optional[list[str]] = None
    headers: Optional[dict] = None
    is_active: Optional[bool] = None
    organization_id: Optional[str] = Field(default=None, validation_alias="organizationId")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookResponse(BaseModel):
    id: str
    organization_id: Optional[str] = None
    name: str
    url: str
    has_secret: bool = False
    events: list[str]
    headers: dict
    is_active: bool
    last_triggered_at: Optional[datetime] = None
    failure_count: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookDeliveryResponse(BaseModel):
    id: str
    webhook_id: str
    event: str
    status: str
    status_code: Optional[int] = None
    request_body: Optional[str] = None
    response_body: Optional[str] = None
    duration_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookTestResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    duration_ms: Optional[int] = None
    error: Optional[str] = None
