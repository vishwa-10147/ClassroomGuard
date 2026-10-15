from __future__ import annotations

from backend.app.core.mailer import send_email


async def send_alert_email(to_email: str, alert: dict) -> bool:
    """Email an alert summary to a staff member."""
    subject = f"[ClassroomGuard] {str(alert.get('severity', '')).upper()} alert: {alert.get('title', 'New alert')}"
    body = (
        f"{alert.get('title', 'New alert')}\n\n"
        f"Severity: {alert.get('severity', '-')}\n"
        f"{alert.get('description') or ''}\n\n"
        "Open ClassroomGuard to review the evidence and acknowledge the alert."
    )
    return await send_email(to_email, subject, body)
