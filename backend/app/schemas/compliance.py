from datetime import datetime

from pydantic import BaseModel, Field


def _to_camel(s: str) -> str:
    parts = s.split("_")
    return parts[0] + "".join(w.capitalize() for w in parts[1:])


class DataRequestCreate(BaseModel):
    user_id: str | None = Field(default=None, validation_alias="userId")
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
    granted_at: datetime | None = None
    revoked_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RetentionPolicyResponse(BaseModel):
    id: str
    organization_id: str | None = None
    resource_type: str
    retention_days: int
    auto_delete: bool
    archive_before_delete: bool
    archive_location: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RetentionPolicyUpdate(BaseModel):
    retention_days: int | None = Field(default=None, validation_alias="retentionDays")
    auto_delete: bool | None = Field(default=None, validation_alias="autoDelete")
    archive_before_delete: bool | None = Field(default=None, validation_alias="archiveBeforeDelete")
    archive_location: str | None = Field(default=None, validation_alias="archiveLocation")

    model_config = {
        "alias_generator": _to_camel,
        "populate_by_name": True,
    }


class ComplianceLogResponse(BaseModel):
    id: str
    organization_id: str | None = None
    event_type: str
    user_id: str | None = None
    resource_type: str | None = None
    resource_id: str | None = None
    details: dict | None = None
    ip_address: str | None = None
    legal_basis: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DataSummaryResponse(BaseModel):
    organization_id: str | None = None
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
