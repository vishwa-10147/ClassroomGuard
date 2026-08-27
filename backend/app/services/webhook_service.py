from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import time
from datetime import UTC, datetime

import httpx
from backend.app.models.webhook import Webhook

logger = logging.getLogger(__name__)


async def deliver_webhook(
    webhook: Webhook,
    event: str,
    payload: dict,
) -> dict:
    """Deliver a webhook with HMAC signing and 3 retries.

    Returns a dict with status info for delivery logging.
    """
    body = json.dumps({
        "event": event,
        "data": payload,
        "timestamp": datetime.now(UTC).isoformat(),
    })

    headers = {"Content-Type": "application/json", **(webhook.headers or {})}

    if webhook.secret:
        sig = hmac.new(
            webhook.secret.encode(),
            body.encode(),
            hashlib.sha256,
        ).hexdigest()
        headers["X-Webhook-Signature"] = f"sha256={sig}"

    last_status_code = None
    last_error = None
    start = time.monotonic()

    async with httpx.AsyncClient(timeout=10) as client:
        for attempt in range(3):
            try:
                resp = await client.post(
                    webhook.url,
                    content=body,
                    headers=headers,
                )
                last_status_code = resp.status_code
                if resp.status_code < 300:
                    duration_ms = int((time.monotonic() - start) * 1000)
                    return {
                        "status": "success",
                        "status_code": resp.status_code,
                        "response_body": resp.text[:2000],
                        "duration_ms": duration_ms,
                    }
                last_error = f"HTTP {resp.status_code}"
            except Exception as exc:
                last_error = str(exc)[:500]
            if attempt < 2:
                await asyncio.sleep(2 ** attempt)

    duration_ms = int((time.monotonic() - start) * 1000)
    return {
        "status": "failed",
        "status_code": last_status_code,
        "response_body": None,
        "duration_ms": duration_ms,
        "error_message": last_error,
    }


async def test_webhook_delivery(
    url: str,
    secret: str | None = None,
    headers: dict | None = None,
) -> dict:
    """Send a test ping to a webhook URL without writing to DB."""
    body = json.dumps({
        "event": "test.ping",
        "data": {"message": "Webhook test from ClassroomGuard"},
        "timestamp": datetime.now(UTC).isoformat(),
    })

    final_headers = {"Content-Type": "application/json", **(headers or {})}
    if secret:
        sig = hmac.new(
            secret.encode(),
            body.encode(),
            hashlib.sha256,
        ).hexdigest()
        final_headers["X-Webhook-Signature"] = f"sha256={sig}"

    start = time.monotonic()
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            resp = await client.post(url, content=body, headers=final_headers)
            duration_ms = int((time.monotonic() - start) * 1000)
            return {
                "success": resp.status_code < 300,
                "status_code": resp.status_code,
                "duration_ms": duration_ms,
            }
        except Exception as exc:
            duration_ms = int((time.monotonic() - start) * 1000)
            return {
                "success": False,
                "status_code": None,
                "duration_ms": duration_ms,
                "error": str(exc)[:500],
            }
