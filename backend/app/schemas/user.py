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
    email: EmailStr
    role: str
    status: str
    avatar: str | None = None
    is_active: bool

    model_config = {
        "from_attributes": True,
    }
