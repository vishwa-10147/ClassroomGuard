from pydantic import BaseModel
from datetime import datetime
from typing import Optional


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
    user_id: Optional[str] = None
    created_at: datetime
    is_active: bool

    model_config = {
        "from_attributes": True,
    }
