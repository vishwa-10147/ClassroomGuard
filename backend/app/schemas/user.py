from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str
    status: str = "active"


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    email: EmailStr | None = None
    role: str | None = None
    status: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str  # validated on input; output must never fail on a stored address
    role: str
    status: str
    avatar: str | None = None
    is_active: bool
    last_login_at: datetime | None = Field(
        default=None, validation_alias="last_active_at", serialization_alias="lastLoginAt"
    )

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }
