"""Create an alert and notify everyone: live dashboards, mobile push, webhooks.

Used both for alerts created by staff (POST /alerts) and for alerts raised automatically from
AI detections (POST /events), so both paths behave identically.
"""

from __future__ import annotations

import logging

from backend.app.api.notifications import send_push_notification
from backend.app.core.websocket import manager
from backend.app.models.alert import Alert
from backend.app.models.push_token import PushToken
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

# AI event types -> readable alert titles
EVENT_TITLES = {
    "PHONE_USAGE": "Mobile phone detected",
    "CALCULATOR_USAGE": "Calculator detected",
    "HANDS_UP_WITH_PHONE": "Phone held up",
    "STUDENT_TURNING_BACK": "Student turned around",
    "SUSPICIOUS_HEAD_TURN": "Suspicious head turn",
    "LOOKING_DOWN": "Prolonged looking down",
}

# Severities of AI detections that become alerts (low-severity cues stay as events only)
ALERTING_SEVERITIES = {"critical", "high", "medium"}


def _payload(alert: Alert) -> dict:
    return {
        "id": str(alert.id),
        "title": alert.title,
        "description": alert.description,
        "severity": alert.severity,
        "status": alert.status,
        "classroom_id": str(alert.classroom_id) if alert.classroom_id else None,
        "camera_id": str(alert.camera_id) if alert.camera_id else None,
        "event_id": str(alert.event_id) if alert.event_id else None,
        "created_at": alert.created_at.isoformat() if alert.created_at else None,
    }


async def create_alert_and_notify(
    db: AsyncSession,
    *,
    title: str,
    description: str,
    severity: str,
    status: str = "active",
    classroom_id: str | None = None,
    camera_id: str | None = None,
    event_id: str | None = None,
    organization_id: str | None = None,
) -> Alert:
    alert = Alert(
        title=title,
        description=description,
        severity=severity,
        status=status,
        classroom_id=classroom_id,
        camera_id=camera_id,
        event_id=event_id,
        organization_id=organization_id,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    payload = _payload(alert)

    # Notification channels are best effort: a failing channel must never lose the alert
    try:
        tokens = (await db.execute(select(PushToken.token).where(PushToken.is_active))).scalars().all()
        for token in tokens:
            await send_push_notification(
                token=token, title=alert.title, body=alert.description,
                data={"alert_id": alert.id, "severity": alert.severity},
            )
    except Exception:
        logger.exception("Push notification failed for alert %s", alert.id)

    await manager.broadcast({"type": "alert", "payload": payload})

    try:
        from backend.app.core.webhook_dispatcher import dispatch_event
        await dispatch_event("alert.created", payload)
    except Exception:
        logger.exception("Webhook dispatch failed for alert %s", alert.id)

    return alert
