import json
from datetime import UTC, datetime

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.models.role import Role
from backend.app.models.user import User
from backend.app.schemas.role import (
    RoleCreate,
    RoleResponse,
    RoleUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/roles", tags=["Roles"])

VIEW_ROLES = ("super_admin", "admin", "faculty", "security", "viewer")
SUPER_ADMIN_ROLES = ("super_admin",)

DEFAULT_ROLES = [
    {
        "name": "super_admin",
        "description": "Full system access with all permissions",
        "permissions": [
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
        ],
        "is_system": True,
    },
    {
        "name": "admin",
        "description": "Administrative access to manage users, cameras, and alerts",
        "permissions": [
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
        ],
        "is_system": True,
    },
    {
        "name": "faculty",
        "description": "Faculty access to view cameras, alerts, and reports for their classrooms",
        "permissions": [
            "cameras:read",
            "classrooms:read",
            "alerts:read", "alerts:manage",
            "incidents:read",
            "recordings:read",
            "events:read",
            "reports:read",
        ],
        "is_system": True,
    },
    {
        "name": "security",
        "description": "Security personnel access to cameras, alerts, and incident management",
        "permissions": [
            "cameras:read",
            "classrooms:read",
            "alerts:read", "alerts:write", "alerts:manage",
            "incidents:read", "incidents:write",
            "recordings:read",
            "events:read",
            "reports:read",
        ],
        "is_system": True,
    },
    {
        "name": "viewer",
        "description": "Read-only access to view dashboards and reports",
        "permissions": [
            "cameras:read",
            "classrooms:read",
            "alerts:read",
            "incidents:read",
            "events:read",
            "reports:read",
        ],
        "is_system": True,
    },
]


async def ensure_default_roles(db: AsyncSession) -> None:
    result = await db.execute(select(Role))
    existing = {r.name for r in result.scalars().all()}
    for role_data in DEFAULT_ROLES:
        if role_data["name"] not in existing:
            role = Role(
                name=role_data["name"],
                description=role_data["description"],
                permissions=json.dumps(role_data["permissions"]),
                is_system=role_data["is_system"],
            )
            db.add(role)
    await db.commit()


@router.get("", response_model=list[RoleResponse])
async def list_roles(
    _user: User = Depends(require_permission("roles:read")),
    db: AsyncSession = Depends(get_db),
):
    await ensure_default_roles(db)
    result = await db.execute(select(Role).order_by(Role.name))
    return result.scalars().all()


@router.get("/{role_id}", response_model=RoleResponse)
async def get_role(
    role_id: str,
    _user: User = Depends(require_permission("roles:read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router.post("", response_model=RoleResponse, status_code=201)
async def create_role(
    request: Request,
    body: RoleCreate,
    _user: User = Depends(require_permission("roles:write")),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Role).where(Role.name == body.name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Role with this name already exists")

    role = Role(
        name=body.name,
        description=body.description,
        permissions=json.dumps(body.permissions),
        is_system=False,
    )
    db.add(role)
    await log_audit(
        db, _user, "create", "role",
        new_value={"name": body.name, "permissions": body.permissions},
        request=request,
    )
    await db.commit()
    await db.refresh(role)
    return role


@router.patch("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: str,
    request: Request,
    body: RoleUpdate,
    _user: User = Depends(require_permission("roles:write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    updates = body.model_dump(exclude_unset=True)

    if "name" in updates:
        existing = await db.execute(
            select(Role).where(Role.name == updates["name"], Role.id != role_id)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Role with this name already exists")

    old_perms = role.permissions
    if "permissions" in updates:
        updates["permissions"] = json.dumps(updates["permissions"])

    for key, value in updates.items():
        setattr(role, key, value)

    role.updated_at = datetime.now(UTC)
    await log_audit(
        db, _user, "update", "role",
        resource_id=role_id,
        old_value={"permissions": old_perms},
        new_value=updates,
        request=request,
    )
    await db.commit()
    await db.refresh(role)
    return role


@router.delete("/{role_id}")
async def delete_role(
    role_id: str,
    request: Request,
    _user: User = Depends(require_permission("roles:delete")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Role).where(Role.id == role_id))
    role = result.scalar_one_or_none()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    if role.is_system:
        raise HTTPException(status_code=400, detail="Cannot delete a system role")

    await log_audit(
        db, _user, "delete", "role",
        resource_id=role_id,
        old_value={"name": role.name, "description": role.description},
        request=request,
    )
    await db.delete(role)
    await db.commit()

    return {"message": "Role deleted successfully", "id": role_id}
