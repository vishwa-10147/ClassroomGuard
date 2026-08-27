from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class DataRequestCreate(BaseModel):
    user_id: Optional[str] = Field(default=None, validation_alias="userId")
    request_type: str = Field(default="export", validation_alias="requestType")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class DataRequestResponse(BaseModel):
    request_id: str
    status: str
    message: str
    created_at: str

    model_config = {"from_attributes": True}


class ConsentCreate(BaseModel):
    consent_type: str = Field(validation_alias="consentType")
    granted: bool

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class ConsentResponse(BaseModel):
    id: str
    user_id: str
    consent_type: str
    granted: bool
    granted_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RetentionPolicyResponse(BaseModel):
    id: str
    organization_id: Optional[str] = None
    resource_type: str
    retention_days: int
    auto_delete: bool
    archive_before_delete: bool
    archive_location: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RetentionPolicyUpdate(BaseModel):
    retention_days: Optional[int] = Field(default=None, validation_alias="retentionDays")
    auto_delete: Optional[bool] = Field(default=None, validation_alias="autoDelete")
    archive_before_delete: Optional[bool] = Field(default=None, validation_alias="archiveBeforeDelete")
    archive_location: Optional[str] = Field(default=None, validation_alias="archiveLocation")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class ComplianceLogResponse(BaseModel):
    id: str
    organization_id: Optional[str] = None
    event_type: str
    user_id: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[dict] = None
    ip_address: Optional[str] = None
    legal_basis: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DataSummaryResponse(BaseModel):
    organization_id: Optional[str] = None
    evidence_count: int = 0
    recordings_count: int = 0
    alerts_count: int = 0
    audit_logs_count: int = 0
    users_count: int = 0
    consents_count: int = 0
    storage_used_bytes: int = 0


class UserErasureResponse(BaseModel):
    status: str
    message: str
    user_id: str
