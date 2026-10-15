import json
from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class RoleCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    description: str = ""
    permissions: list[str] = []


class RoleUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = None
    permissions: list[str] | None = None


def _to_camel(s: str) -> str:
    head, *rest = s.split("_")
    return head + "".join(w.capitalize() for w in rest)


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str
    permissions: list[str]
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }

    @field_validator("permissions", mode="before")
    @classmethod
    def _parse_permissions(cls, v):
        # Stored as a JSON-encoded string on the Role model
        return json.loads(v) if isinstance(v, str) else v
