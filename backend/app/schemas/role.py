from datetime import datetime

from pydantic import BaseModel, Field


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: str = ""
    permissions: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None
    permissions: list[str] | None = None


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
