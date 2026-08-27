from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.api.dependencies import get_db, get_current_user, require_permission
from backend.app.models.webhook import Webhook
from backend.app.models.webhook_delivery import WebhookDelivery
from backend.app.schemas.webhook import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookDeliveryResponse,
    WebhookTestResponse,
)
from backend.app.services.webhook_service import test_webhook_delivery

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])


def _webhook_response(wh: Webhook) -> dict:
    """Build a response dict that hides the raw secret."""
    return {
        "id": wh.id,
        "organization_id": wh.organization_id,
        "name": wh.name,
        "url": wh.url,
        "has_secret": bool(wh.secret),
        "events": wh.events or [],
        "headers": wh.headers or {},
        "is_active": wh.is_active,
        "last_triggered_at": wh.last_triggered_at,
        "failure_count": wh.failure_count,
        "created_by": wh.created_by,
        "created_at": wh.created_at,
        "updated_at": wh.updated_at,
    }


@router.post("", response_model=WebhookResponse, status_code=201)
async def create_webhook(
    body: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(require_permission("webhooks.manage")),
):
    webhook = Webhook(
        name=body.name,
        url=body.url,
        secret=body.secret,
        events=body.events,
        headers=body.headers,
        is_active=body.is_active,
        organization_id=body.organization_id,
        created_by=user.id,
    )
    db.add(webhook)
    await db.commit()
    await db.refresh(webhook)
    return _webhook_response(webhook)


@router.get("", response_model=list[WebhookResponse])
async def list_webhooks(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.view")),
):
    query = (
        select(Webhook)
        .order_by(Webhook.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return [_webhook_response(wh) for wh in result.scalars().all()]


@router.get("/count")
async def webhook_count(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.view")),
):
    total = await db.scalar(select(func.count()).select_from(Webhook))
    active = await db.scalar(
        select(func.count()).select_from(Webhook).where(Webhook.is_active.is_(True))
    )
    return {"total": total or 0, "active": active or 0}


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.view")),
):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return _webhook_response(webhook)


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.manage")),
):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(webhook, field, value)

    await db.commit()
    await db.refresh(webhook)
    return _webhook_response(webhook)


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.manage")),
):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(webhook)
    await db.commit()


@router.post("/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.manage")),
):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    test_result = await test_webhook_delivery(
        url=webhook.url,
        secret=webhook.secret,
        headers=webhook.headers,
    )
    return test_result


@router.get("/{webhook_id}/deliveries", response_model=list[WebhookDeliveryResponse])
async def list_deliveries(
    webhook_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks.view")),
):
    result = await db.execute(select(Webhook).where(Webhook.id == webhook_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Webhook not found")

    query = (
        select(WebhookDelivery)
        .where(WebhookDelivery.webhook_id == webhook_id)
        .order_by(WebhookDelivery.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return result.scalars().all()
