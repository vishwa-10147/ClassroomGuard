from __future__ import annotations

import functools
import hashlib
import json
import logging
from collections.abc import Callable

from backend.app.core.redis import get_redis
from fastapi import Request, Response

logger = logging.getLogger(__name__)


def _build_cache_key(prefix: str, request: Request) -> str:
    path = request.url.path
    query = str(request.url.query) if request.url.query else ""
    raw = f"{path}?{query}" if query else path
    return f"{prefix}:{hashlib.md5(raw.encode()).hexdigest()}"


def cache_response(ttl: int = 300, prefix: str = ""):
    """Decorator for FastAPI GET endpoints that caches JSON responses in Redis.

    Falls back gracefully — if Redis is unavailable the endpoint runs uncached.
    """

    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, request: Request, **kwargs):
            client = get_redis()
            if client is None:
                return await func(*args, request=request, **kwargs)

            key = _build_cache_key(prefix or func.__name__, request)
            try:
                cached = await client.get(key)
                if cached is not None:
                    return Response(
                        content=cached,
                        media_type="application/json",
                        headers={"X-Cache": "HIT"},
                    )
            except Exception:
                logger.debug("Redis GET failed for key %s", key, exc_info=True)

            response = await func(*args, request=request, **kwargs)

            try:
                body = response.body if hasattr(response, "body") else json.dumps(response).encode()
                if isinstance(body, (bytes | bytearray)):
                    raw = body
                else:
                    raw = json.dumps(response).encode()
                await client.setex(key, ttl, raw)
            except Exception:
                logger.debug("Redis SET failed for key %s", key, exc_info=True)

            if hasattr(response, "headers"):
                response.headers["X-Cache"] = "MISS"
            return response

        return wrapper

    return decorator


async def invalidate_cache(prefix: str) -> int:
    """Delete all keys matching *prefix*:*. Returns count of deleted keys."""
    client = get_redis()
    if client is None:
        return 0
    count = 0
    try:
        pattern = f"{prefix}:*"
        cursor = 0
        while True:
            cursor, keys = await client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                await client.delete(*keys)
                count += len(keys)
            if cursor == 0:
                break
    except Exception:
        logger.debug("Redis invalidate failed for prefix %s", prefix, exc_info=True)
    return count
