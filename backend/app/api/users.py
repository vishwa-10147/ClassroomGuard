from uuid import uuid4

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.core.permissions import ROLE_PERMISSIONS
from backend.app.core.security import hash_password
from backend.app.models.user import User
from backend.app.schemas.user import (
    UserCreate,
    UserResponse,
    UserUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


def _guard_user_change(actor: User, new_role: str | None = None, target: User | None = None) -> None:
    """Block unknown roles and stop non-super-admins from creating, promoting or editing super admins."""
    if new_role is not None and new_role not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=422, detail=f"Unknown role: {new_role}")
    if actor.role == "super_admin":
        return
    if new_role == "super_admin" or (target is not None and target.role == "super_admin"):
        raise HTTPException(status_code=403, detail="Only a super admin can manage super admin accounts")


def _user_scope(actor: User) -> tuple:
    """Return the tenant predicate; only an explicit super admin is global."""
    if actor.role == "super_admin":
        return ()
    if not actor.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    return (User.organization_id == actor.organization_id,)


@router.get(
    "",
    response_model=list[UserResponse],
)
async def list_users(
    current_user: User = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(*_user_scope(current_user)).order_by(User.created_at.desc())
    )

    return result.scalars().all()


@router.get(
    "/{user_id}",
    response_model=UserResponse,
)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, *_user_scope(current_user))
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    return user


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_user(
    request: Request,
    user_data: UserCreate,
    current_user: User = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db),
):
    _guard_user_change(current_user, new_role=user_data.role)
    existing = await db.execute(
        select(User).where(User.email == user_data.email, *_user_scope(current_user))
    )

    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="A user with this email already exists",
        )

    user = User(
        id=str(uuid4()),
        name=user_data.name,
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        status=user_data.status,
        is_active=user_data.status == "active",
        organization_id=current_user.organization_id,
    )

    db.add(user)
    await log_audit(
        db, current_user, "create", "user",
        resource_id=None,
        new_value={"name": user.name, "email": user.email, "role": user.role},
        request=request,
    )
    await db.commit()
    await db.refresh(user)

    return user


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
)
async def update_user(
    user_id: str,
    request: Request,
    update_data: UserUpdate,
    current_user: User = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, *_user_scope(current_user))
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    updates = update_data.model_dump(exclude_unset=True)
    _guard_user_change(current_user, new_role=updates.get("role"), target=user)

    if "email" in updates:
        existing = await db.execute(
            select(User).where(
                User.email == updates["email"],
                User.id != user_id,
                *_user_scope(current_user),
            )
        )

        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="A user with this email already exists",
            )

    old_data = {"name": user.name, "email": user.email, "role": user.role, "status": user.status}

    for key, value in updates.items():
        setattr(user, key, value)

    if "status" in updates:
        user.is_active = updates["status"] == "active"

    await log_audit(
        db, current_user, "update", "user",
        resource_id=user_id,
        old_value=old_data,
        new_value=updates,
        request=request,
    )
    await db.commit()
    await db.refresh(user)

    return user


@router.put(
    "/{user_id}",
    response_model=UserResponse,
)
async def put_user(
    user_id: str,
    request: Request,
    update_data: UserUpdate,
    current_user: User = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.id == user_id, *_user_scope(current_user))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    updates = update_data.model_dump(exclude_unset=True)
    _guard_user_change(current_user, new_role=updates.get("role"), target=user)
    if "email" in updates:
        existing = await db.execute(
            select(User).where(
                User.email == updates["email"], User.id != user_id, *_user_scope(current_user)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="A user with this email already exists")

    old_data = {"name": user.name, "email": user.email, "role": user.role, "status": user.status}

    for key, value in updates.items():
        setattr(user, key, value)
    if "status" in updates:
        user.is_active = updates["status"] == "active"

    await log_audit(
        db, current_user, "update", "user",
        resource_id=user_id,
        old_value=old_data,
        new_value=updates,
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.post(
    "/{user_id}/disable",
    response_model=UserResponse,
)
async def disable_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_permission("users:write")),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot disable your own account")

    result = await db.execute(
        select(User).where(User.id == user_id, *_user_scope(current_user))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    _guard_user_change(current_user, target=user)

    old_status = user.status
    user.status = "disabled"
    user.is_active = False

    await log_audit(
        db, current_user, "disable", "user",
        resource_id=user_id,
        old_value={"status": old_status},
        new_value={"status": "disabled"},
        request=request,
    )
    await db.commit()
    await db.refresh(user)
    return user


@router.delete(
    "/{user_id}",
)
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_permission("users:delete")),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account",
        )

    result = await db.execute(
        select(User).where(User.id == user_id, *_user_scope(current_user))
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    await log_audit(
        db, current_user, "delete", "user",
        resource_id=user_id,
        old_value={"name": user.name, "email": user.email, "role": user.role},
        request=request,
    )
    await db.delete(user)
    await db.commit()

    return {
        "message": "User deleted successfully",
        "id": user_id,
    }
