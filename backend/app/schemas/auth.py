from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    status: str
    avatar: str | None = None

    model_config = {
        "from_attributes": True,
    }


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(default=900, description="Access token TTL in seconds")
    user: UserResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(default=900, description="Access token TTL in seconds")


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=512)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)

class Verify2FARequest(BaseModel):
    email: EmailStr
    token: str
