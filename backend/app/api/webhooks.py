from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.webhook import Webhook
from backend.app.models.webhook_delivery import WebhookDelivery
from backend.app.schemas.webhook import (
    WebhookCreate,
    WebhookDeliveryResponse,
    WebhookResponse,
    WebhookTestResponse,
    WebhookUpdate,
)
from backend.app.services.webhook_service import _validate_webhook_url, test_webhook_delivery
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
    user=Depends(require_permission("webhooks:manage")),
):
    if not user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    try:
        _validate_webhook_url(body.url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    webhook = Webhook(
        name=body.name,
        url=body.url,
        secret=body.secret,
        events=body.events,
        headers=body.headers,
        is_active=body.is_active,
        organization_id=user.organization_id,
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
    _user=Depends(require_permission("webhooks:view")),
):
    if not _user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    query = (
        select(Webhook)
        .where(Webhook.organization_id == _user.organization_id)
        .order_by(Webhook.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return [_webhook_response(wh) for wh in result.scalars().all()]


@router.get("/count")
async def webhook_count(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks:view")),
):
    if not _user.organization_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")
    total = await db.scalar(select(func.count()).select_from(Webhook).where(Webhook.organization_id == _user.organization_id))
    active = await db.scalar(
        select(func.count()).select_from(Webhook).where(
            Webhook.is_active.is_(True), Webhook.organization_id == _user.organization_id
        )
    )
    return {"total": total or 0, "active": active or 0}


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks:view")),
):
    result = await db.execute(select(Webhook).where(
        Webhook.id == webhook_id, Webhook.organization_id == _user.organization_id
    ))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return _webhook_response(webhook)


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    body: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks:manage")),
):
    result = await db.execute(select(Webhook).where(
        Webhook.id == webhook_id, Webhook.organization_id == _user.organization_id
    ))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")

    update_data = body.model_dump(exclude_unset=True)
    update_data.pop("organization_id", None)
    if "url" in update_data and update_data["url"]:
        try:
            _validate_webhook_url(update_data["url"])
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
    for field, value in update_data.items():
        setattr(webhook, field, value)

    await db.commit()
    await db.refresh(webhook)
    return _webhook_response(webhook)


@router.delete("/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks:manage")),
):
    result = await db.execute(select(Webhook).where(
        Webhook.id == webhook_id, Webhook.organization_id == _user.organization_id
    ))
    webhook = result.scalar_one_or_none()
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(webhook)
    await db.commit()


@router.post("/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: str,
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("webhooks:manage")),
):
    result = await db.execute(select(Webhook).where(
        Webhook.id == webhook_id, Webhook.organization_id == _user.organization_id
    ))
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
    _user=Depends(require_permission("webhooks:view")),
):
    result = await db.execute(select(Webhook).where(
        Webhook.id == webhook_id, Webhook.organization_id == _user.organization_id
    ))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Webhook not found")

    query = (
        select(WebhookDelivery)
        .join(Webhook, Webhook.id == WebhookDelivery.webhook_id)
        .where(
            WebhookDelivery.webhook_id == webhook_id,
            Webhook.organization_id == _user.organization_id,
        )
        .order_by(WebhookDelivery.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    return result.scalars().all()
