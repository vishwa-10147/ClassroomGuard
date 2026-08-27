from datetime import datetime

from pydantic import BaseModel, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class WebhookCreate(BaseModel):
    name: str
    url: str
    secret: str | None = None
    events: list[str] = Field(default_factory=list)
    headers: dict = Field(default_factory=dict)
    is_active: bool = True
    organization_id: str | None = Field(default=None, validation_alias="organizationId")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    secret: str | None = None
    events: list[str] | None = None
    headers: dict | None = None
    is_active: bool | None = None
    organization_id: str | None = Field(default=None, validation_alias="organizationId")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookResponse(BaseModel):
    id: str
    organization_id: str | None = None
    name: str
    url: str
    has_secret: bool = False
    events: list[str]
    headers: dict
    is_active: bool
    last_triggered_at: datetime | None = None
    failure_count: int
    created_by: str | None = None
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
    status_code: int | None = None
    request_body: str | None = None
    response_body: str | None = None
    duration_ms: int | None = None
    error_message: str | None = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class WebhookTestResponse(BaseModel):
    success: bool
    status_code: int | None = None
    duration_ms: int | None = None
    error: str | None = None
