import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from backend.app.api.dependencies import get_current_user, get_db
from backend.app.core.audit import log_audit
from backend.app.core.config import settings
from backend.app.core.mailer import send_email
from backend.app.core.rate_limit import LOGIN_RATE_LIMIT, limiter
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from backend.app.models.organization import Organization
from backend.app.models.refresh_token import RefreshToken
from backend.app.models.user import User
from backend.app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

RESET_TOKEN_HOURS = 1


def _hash_reset_token(token: str) -> str:
    # Only the hash is stored, so a database leak does not expose usable reset links
    return hash_refresh_token(token)


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
    if not settings.allow_self_registration:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Self-registration is disabled")
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
    user.last_active_at = datetime.now(UTC)  # shown as "Last active" on the Users page
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

@router.post("/forgot-password")
@limiter.limit(LOGIN_RATE_LIMIT)
async def forgot_password(
    request: Request,
    response: Response,  # required by the rate limiter to set its headers
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == body.email, User.is_active.is_(True)))
    user = result.scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_password_token = _hash_reset_token(token)
        user.reset_password_expires_at = datetime.now(UTC) + timedelta(hours=RESET_TOKEN_HOURS)
        await db.commit()
        link = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
        await send_email(
            user.email,
            "Reset your ClassroomGuard password",
            f"Hello {user.name},\n\n"
            f"Use this link within {RESET_TOKEN_HOURS} hour to choose a new password:\n{link}\n\n"
            "If you did not ask for this, ignore this email; your password is unchanged.",
        )
    # Same answer either way, so the endpoint cannot be used to discover accounts
    return {"message": "If an account exists, a reset email was sent."}


@router.post("/reset-password")
@limiter.limit(LOGIN_RATE_LIMIT)
async def reset_password(
    request: Request,
    response: Response,  # required by the rate limiter to set its headers
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.reset_password_token == _hash_reset_token(body.token)))
    user = result.scalar_one_or_none()
    if not user or not user.reset_password_expires_at or user.reset_password_expires_at < datetime.now(UTC):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user.password_hash = hash_password(body.new_password)
    user.reset_password_token = None
    user.reset_password_expires_at = None
    # Sign the account out everywhere
    await db.execute(
        update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True)
    )
    await log_audit(db, user, "reset_password", "auth", request=request)
    await db.commit()
    return {"message": "Password reset successfully."}
