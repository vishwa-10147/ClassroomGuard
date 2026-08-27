from uuid import uuid4

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
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


@router.get(
    "",
    response_model=list[UserResponse],
)
async def list_users(
    current_user: User = Depends(require_permission("users:read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
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
        select(User).where(User.id == user_id)
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
    existing = await db.execute(
        select(User).where(User.email == user_data.email)
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
        select(User).where(User.id == user_id)
    )

    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    updates = update_data.model_dump(exclude_unset=True)

    if "email" in updates:
        existing = await db.execute(
            select(User).where(
                User.email == updates["email"],
                User.id != user_id,
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
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    updates = update_data.model_dump(exclude_unset=True)
    if "email" in updates:
        existing = await db.execute(
            select(User).where(User.email == updates["email"], User.id != user_id)
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
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

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
        select(User).where(User.id == user_id)
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
