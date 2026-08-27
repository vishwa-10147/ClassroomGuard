from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: str = ""
    permissions: list[str] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=50)
    description: Optional[str] = None
    permissions: Optional[list[str]] = None


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str
    permissions: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }
