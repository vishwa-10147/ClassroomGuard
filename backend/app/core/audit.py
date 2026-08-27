from __future__ import annotations

import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.models.audit_log import AuditLog
from backend.app.models.user import User


def get_client_ip(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def get_user_agent(request: Optional[Request]) -> Optional[str]:
    if request is None:
        return None
    return request.headers.get("user-agent")


def _serialize(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    try:
        return json.dumps(value, default=str)
    except (TypeError, ValueError):
        return str(value)


async def log_audit(
    db: AsyncSession,
    user: Optional[User],
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    old_value: Any = None,
    new_value: Any = None,
    request: Optional[Request] = None,
    details: Optional[str] = None,
) -> AuditLog:
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)

    detail_parts = []
    if details:
        detail_parts.append(details)
    if user_agent:
        detail_parts.append(f"ua={user_agent}")
    if old_value is not None:
        detail_parts.append(f"old={_serialize(old_value)}")
    if new_value is not None:
        detail_parts.append(f"new={_serialize(new_value)}")

    log = AuditLog(
        user_id=user.id if user else None,
        user_name=user.name if user else "system",
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details="; ".join(detail_parts) if detail_parts else None,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    db.add(log)
    return log
