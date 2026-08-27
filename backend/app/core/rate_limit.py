from __future__ import annotations

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _get_user_id_or_ip(request: Request) -> str:
    """Return user ID from JWT if authenticated, else fall back to IP."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            from backend.app.core.security import decode_access_token
            payload = decode_access_token(auth[7:])
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
        except Exception:
            pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(
    key_func=_get_user_id_or_ip,
    default_limits=["60/minute"],
    headers_enabled=True,
)

LOGIN_RATE_LIMIT = "5/minute"
API_RATE_LIMIT = "60/minute"
AUTHENTICATED_RATE_LIMIT = "120/minute"
