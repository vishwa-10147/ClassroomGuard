from __future__ import annotations

import logging
from typing import Optional

from redis.asyncio import Redis, ConnectionPool

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[ConnectionPool] = None
_client: Optional[Redis] = None


def _build_pool() -> ConnectionPool:
    return ConnectionPool.from_url(
        settings.redis_url,
        decode_responses=True,
        max_connections=20,
    )


def get_redis() -> Optional[Redis]:
    """Return an async Redis client, or None if Redis is disabled/unavailable."""
    global _pool, _client
    if not settings.use_redis:
        return None
    if _client is None:
        try:
            _pool = _build_pool()
            _client = Redis(connection_pool=_pool)
        except Exception:
            logger.warning("Could not create Redis connection pool", exc_info=True)
            return None
    return _client


async def close_redis() -> None:
    global _pool, _client
    if _client is not None:
        await _client.aclose()
        _client = None
    if _pool is not None:
        await _pool.aclose()
        _pool = None


async def redis_health_check() -> str:
    client = get_redis()
    if client is None:
        return "disabled"
    try:
        await client.ping()
        return "connected"
    except Exception:
        return "disconnected"
