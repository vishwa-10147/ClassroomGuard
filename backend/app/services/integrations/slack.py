from __future__ import annotations

import json
import logging

import httpx

logger = logging.getLogger(__name__)

SEVERITY_COLORS = {
    "critical": "#dc2626",
    "high": "#ea580c",
    "medium": "#d97706",
    "low": "#2563eb",
    "info": "#6b7280",
}


async def send_slack_message(
    webhook_url: str,
    alert: dict,
    channel: str | None = None,
) -> bool:
    """Send an alert as a Slack Block Kit message.

    ``alert`` should contain: title, description, severity, classroom_id,
    camera_id, created_at, and optionally id.
    """
    severity = alert.get("severity", "info")
    color = SEVERITY_COLORS.get(severity, "#6b7280")

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"🚨 {alert.get('title', 'ClassroomGuard Alert')}",
                "emoji": True,
            },
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": alert.get("description", "No description"),
            },
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": f"*Severity:*\n{severity.upper()}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Classroom:*\n{alert.get('classroom_id') or 'N/A'}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Camera:*\n{alert.get('camera_id') or 'N/A'}",
                },
                {
                    "type": "mrkdwn",
                    "text": f"*Time:*\n{alert.get('created_at', 'N/A')}",
                },
            ],
        },
    ]

    alert_id = alert.get("id")
    if alert_id:
        blocks.append({
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "View in ClassGuard",
                        "emoji": True,
                    },
                    "url": f"/alerts/{alert_id}",
                    "style": "primary",
                },
            ],
        })

    payload: dict = {"blocks": blocks, "attachments": [{"color": color}]}

    if channel:
        payload["channel"] = channel

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                webhook_url,
                content=json.dumps(payload),
                headers={"Content-Type": "application/json"},
            )
            return resp.status_code < 300
    except Exception:
        logger.exception("Slack delivery failed")
        return False
