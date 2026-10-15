"""Outgoing email over SMTP (college mail server, Microsoft 365, Gmail Workspace, Amazon SES).

Configured with SMTP_* environment variables. When SMTP_HOST is empty, messages are logged
instead of sent, so development and test setups need no mail server.
"""

from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage

from backend.app.core.config import settings
from starlette.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.smtp_host)


def _send_blocking(message: EmailMessage) -> None:
    context = ssl.create_default_context()
    if settings.smtp_ssl:
        server: smtplib.SMTP = smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, context=context, timeout=15)
    else:
        server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
    with server:
        if settings.smtp_starttls and not settings.smtp_ssl:
            server.starttls(context=context)
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)


async def send_email(to: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns False (and logs) instead of raising on failure."""
    if not is_configured():
        logger.warning("SMTP not configured - email to %s not sent (subject: %s)", to, subject)
        return False
    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)
    try:
        await run_in_threadpool(_send_blocking, message)
        return True
    except Exception:
        logger.exception("Failed to send email to %s (subject: %s)", to, subject)
        return False
