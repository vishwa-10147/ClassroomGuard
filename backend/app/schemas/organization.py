from datetime import datetime
from pydantic import BaseModel, Field


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    plan: str = Field(default="free", pattern=r"^(free|pro|enterprise)$")


class OrganizationUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=200)
    slug: str | None = Field(default=None, min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    plan: str | None = Field(default=None, pattern=r"^(free|pro|enterprise)$")
    max_cameras: int | None = Field(default=None, ge=1)
    max_users: int | None = Field(default=None, ge=1)
    settings: dict | None = None
    is_active: bool | None = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    max_cameras: int
    max_users: int
    settings: dict | None = None
    is_active: bool
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class OrganizationStats(BaseModel):
    organization_id: str
    camera_count: int
    user_count: int
    alert_count: int
    classroom_count: int
    incident_count: int
    max_cameras: int
    max_users: int
    plan: str


class OrganizationInvite(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    role: str = Field(default="viewer", pattern=r"^(admin|faculty|security|viewer)$")
