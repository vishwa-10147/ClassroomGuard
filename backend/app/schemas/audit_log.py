from datetime import datetime

from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    user_id: str | None = None
    user_name: str = Field(min_length=1, max_length=120)
    action: str = Field(min_length=1, max_length=50)
    resource_type: str = Field(min_length=1, max_length=50)
    resource_id: str | None = None
    details: str | None = None
    ip_address: str | None = None


class AuditLogResponse(BaseModel):
    id: str
    user_id: str | None = None
    user_name: str
    action: str
    resource_type: str
    resource_id: str | None = None
    details: str | None = None
    ip_address: str | None = None
    user_agent: str | None = None
    timestamp: datetime

    model_config = {
        "from_attributes": True,
    }
