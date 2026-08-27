
import httpx
from backend.app.api.dependencies import get_current_user, get_db
from backend.app.models.push_token import PushToken
from backend.app.schemas.push_token import PushTokenRegister, PushTokenResponse
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/notifications", tags=["Notifications"])


async def send_push_notification(token: str, title: str, body: str, data: dict | None = None):
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "data": data or {},
    }
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://exp.host/--/api/v2/push/send",
                json=payload,
                timeout=10.0,
            )
            resp.raise_for_status()
    except (httpx.HTTPError, Exception):
        return


@router.post("/register", response_model=PushTokenResponse, status_code=201)
async def register_token(
    body: PushTokenRegister,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(
        select(PushToken).where(PushToken.token == body.token)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Token already registered")

    record = PushToken(
        token=body.token,
        platform=body.platform,
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record


@router.get("/tokens", response_model=list[PushTokenResponse])
async def list_tokens(
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(
        select(PushToken).where(PushToken.is_active)
    )
    return result.scalars().all()


@router.delete("/tokens/{token_id}", status_code=204)
async def delete_token(
    token_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(get_current_user),
):
    result = await db.execute(
        select(PushToken).where(PushToken.id == token_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Token not found")
    record.is_active = False
    await db.commit()
