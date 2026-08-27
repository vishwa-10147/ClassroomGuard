from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class SettingUpdate(BaseModel):
    key: str
    value: Any


class SettingBulkUpdate(BaseModel):
    settings: list[SettingUpdate]


class SettingResponse(BaseModel):
    key: str
    value: str
    category: str
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class SettingGroupResponse(BaseModel):
    category: str
    settings: list[SettingResponse]
