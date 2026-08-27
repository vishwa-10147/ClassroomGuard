from datetime import datetime

from pydantic import BaseModel


class PushTokenRegister(BaseModel):
    token: str
    platform: str

    model_config = {
        "from_attributes": True,
    }


class PushTokenResponse(BaseModel):
    id: str
    token: str
    platform: str
    user_id: str | None = None
    created_at: datetime
    is_active: bool

    model_config = {
        "from_attributes": True,
    }
