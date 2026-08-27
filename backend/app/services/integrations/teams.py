from __future__ import annotations

import json
import logging

import httpx

logger = logging.getLogger(__name__)

SEVERITY_COLORS = {
    "critical": "attention",
    "high": "warning",
    "medium": "accent",
    "low": "good",
    "info": "default",
}


async def send_teams_message(webhook_url: str, alert: dict) -> bool:
    """Send an alert as a Microsoft Teams Adaptive Card."""
    severity = alert.get("severity", "info")
    theme_color = SEVERITY_COLORS.get(severity, "default")

    card = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": theme_color,
        "summary": alert.get("title", "ClassroomGuard Alert"),
        "sections": [
            {
                "activityTitle": f"🚨 {alert.get('title', 'ClassroomGuard Alert')}",
                "facts": [
                    {"name": "Severity", "value": severity.upper()},
                    {"name": "Description", "value": alert.get("description", "N/A")},
                    {"name": "Classroom", "value": alert.get("classroom_id") or "N/A"},
                    {"name": "Camera", "value": alert.get("camera_id") or "N/A"},
                    {"name": "Time", "value": alert.get("created_at", "N/A")},
                ],
                "markdown": True,
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                webhook_url,
                content=json.dumps(card),
                headers={"Content-Type": "application/json"},
            )
            return resp.status_code < 300
    except Exception:
        logger.exception("Teams delivery failed")
        return False
