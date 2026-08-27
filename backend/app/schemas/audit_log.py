from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AuditLogCreate(BaseModel):
    user_id: Optional[str] = None
    user_name: str = Field(min_length=1, max_length=120)
    action: str = Field(min_length=1, max_length=50)
    resource_type: str = Field(min_length=1, max_length=50)
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None


class AuditLogResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: str
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime

    model_config = {
        "from_attributes": True,
    }
