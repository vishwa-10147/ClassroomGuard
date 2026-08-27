from datetime import UTC, datetime
from uuid import uuid4

from backend.app.api.dependencies import get_current_user, get_db
from backend.app.core.audit import log_audit
from backend.app.core.rate_limit import LOGIN_RATE_LIMIT, limiter
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_refresh_token,
    verify_password,
)
from backend.app.models.organization import Organization
from backend.app.models.refresh_token import RefreshToken
from backend.app.models.user import User
from backend.app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    TokenResponse,
    UserResponse,
)
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=120)
    organization_name: str = Field(min_length=2, max_length=200)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(User).where(User.email == body.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    slug = body.organization_name.lower().replace(" ", "-").strip()
    slug = "".join(c for c in slug if c.isalnum() or c == "-")
    slug = slug[:50] or str(uuid4())[:8]

    slug_check = await db.execute(
        select(Organization).where(Organization.slug == slug)
    )
    if slug_check.scalar_one_or_none():
        slug = f"{slug}-{str(uuid4())[:6]}"

    org = Organization(
        id=str(uuid4()),
        name=body.organization_name,
        slug=slug,
        plan="free",
    )
    db.add(org)

    from backend.app.core.security import hash_password
    user = User(
        id=str(uuid4()),
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role="admin",
        status="active",
        organization_id=org.id,
    )
    db.add(user)

    await db.flush()

    token = create_access_token(
        user_id=user.id,
        role=user.role,
        organization_id=user.organization_id,
    )

    raw_refresh, refresh_hash, expires_at = create_refresh_token(user.id)
    refresh_record = RefreshToken(
        token_hash=refresh_hash,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(refresh_record)

    await log_audit(
        db, user, "register", "auth",
        new_value={"email": user.email, "organization": org.name},
        request=request,
    )
    await db.commit()

    return LoginResponse(
        access_token=token,
        refresh_token=raw_refresh,
        expires_in=900,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit(LOGIN_RATE_LIMIT)
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == login_data.email)
    )

    user = result.scalar_one_or_none()

    if user is None or not verify_password(
        login_data.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active or user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    token = create_access_token(
        user_id=user.id,
        role=user.role,
        organization_id=user.organization_id,
    )

    raw_refresh, refresh_hash, expires_at = create_refresh_token(user.id)
    refresh_record = RefreshToken(
        token_hash=refresh_hash,
        user_id=user.id,
        expires_at=expires_at,
    )
    db.add(refresh_record)
    await log_audit(
        db, user, "login", "auth",
        new_value={"email": user.email},
        request=request,
    )
    await db.commit()

    return LoginResponse(
        access_token=token,
        refresh_token=raw_refresh,
        expires_in=900,
        user=UserResponse.model_validate(user),
    )


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
async def refresh_token(
    request: Request,
    body: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    token_hash = hash_refresh_token(body.refresh_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked.is_(False),
        )
    )
    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked refresh token",
        )

    if record.expires_at < datetime.now(UTC):
        record.revoked = True
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    user_result = await db.execute(
        select(User).where(User.id == record.user_id)
    )
    user = user_result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    record.revoked = True

    new_access = create_access_token(
        user_id=user.id,
        role=user.role,
        organization_id=user.organization_id,
    )
    raw_new_refresh, new_refresh_hash, new_expires = create_refresh_token(user.id)
    new_refresh_record = RefreshToken(
        token_hash=new_refresh_hash,
        user_id=user.id,
        expires_at=new_expires,
    )
    db.add(new_refresh_record)
    await log_audit(
        db, user, "token_refresh", "auth",
        request=request,
    )
    await db.commit()

    return TokenResponse(
        access_token=new_access,
        refresh_token=raw_new_refresh,
        expires_in=900,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    body: RefreshRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    token_hash = hash_refresh_token(body.refresh_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == current_user.id,
        )
    )
    record = result.scalar_one_or_none()

    if record is not None and not record.revoked:
        record.revoked = True
        await log_audit(
            db, current_user, "logout", "auth",
            request=request,
        )
        await db.commit()

    return None


@router.get("/me", response_model=UserResponse)
async def me(
    current_user: User = Depends(get_current_user),
):
    return current_user
