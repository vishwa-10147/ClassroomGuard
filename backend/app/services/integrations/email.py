from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


async def send_alert_email(to_email: str, alert: dict) -> bool:
    """Stub email sender — logs the email for now.

    Replace with a real SMTP/SES integration when ready.
    """
    logger.info(
        "EMAIL NOTIFICATION → %s | Title: %s | Severity: %s | %s",
        to_email,
        alert.get("title"),
        alert.get("severity"),
        alert.get("description"),
    )
    return True
