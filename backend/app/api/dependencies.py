from __future__ import annotations

from collections.abc import AsyncGenerator

from backend.app.core.database import AsyncSessionLocal
from backend.app.core.security import decode_access_token
from backend.app.core.tenant import current_org_id
from backend.app.models.user import User
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")
        token_type = payload.get("type")
        if token_type and token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
            )
        org_id = payload.get("organization_id")
        if org_id:
            current_org_id.set(org_id)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_active.is_(True),
        )
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    return current_user


def require_roles(*allowed_roles: str):
    async def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user
    return role_checker


def _get_user_permissions(user: User) -> list[str]:
    """Extract permission list from user's role name."""
    role_perms = {
        "super_admin": [
            "users:read", "users:write", "users:delete",
            "roles:read", "roles:write", "roles:delete",
            "cameras:read", "cameras:write", "cameras:delete",
            "classrooms:read", "classrooms:write", "classrooms:delete",
            "alerts:read", "alerts:write", "alerts:manage",
            "incidents:read", "incidents:write",
            "recordings:read", "recordings:delete",
            "events:read",
            "reports:read", "reports:write",
            "settings:read", "settings:write",
            "audit_logs:read", "audit_logs:write",
            "webhooks:view", "webhooks:manage",
        ],
        "admin": [
            "users:read", "users:write",
            "cameras:read", "cameras:write", "cameras:delete",
            "classrooms:read", "classrooms:write",
            "alerts:read", "alerts:write", "alerts:manage",
            "incidents:read", "incidents:write",
            "recordings:read", "recordings:delete",
            "events:read",
            "reports:read", "reports:write",
            "settings:read",
            "audit_logs:read",
            "webhooks:view", "webhooks:manage",
        ],
        "faculty": [
            "cameras:read",
            "classrooms:read",
            "alerts:read", "alerts:manage",
            "incidents:read",
            "recordings:read",
            "events:read",
            "reports:read",
            "webhooks:view",
        ],
        "security": [
            "cameras:read",
            "classrooms:read",
            "alerts:read", "alerts:write", "alerts:manage",
            "incidents:read", "incidents:write",
            "recordings:read",
            "events:read",
            "reports:read",
            "webhooks:view",
        ],
        "viewer": [
            "cameras:read",
            "classrooms:read",
            "alerts:read",
            "incidents:read",
            "events:read",
            "reports:read",
            "webhooks:view",
        ],
    }
    return role_perms.get(user.role, [])


def require_permission(permission: str):
    async def dep(
        current_user: User = Depends(get_current_user),
    ) -> User:
        permissions = _get_user_permissions(current_user)
        if permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions: {permission} required",
            )
        return current_user
    return dep
