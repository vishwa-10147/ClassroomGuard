import time
import logging
from typing import Any

from fastapi import APIRouter
from sqlalchemy import text

from backend.app.core.database import engine
from backend.app.core.redis import redis_health_check

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/health", tags=["health"])

_START_TIME = time.monotonic()


async def _check_database() -> dict[str, Any]:
    try:
        start = time.perf_counter()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "up", "latency_ms": latency}
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        return {"status": "down", "latency_ms": -1}


async def _check_redis() -> dict[str, Any]:
    status = await redis_health_check()
    return {"status": "up" if status == "connected" else "down", "latency_ms": 0}


async def _check_gpu() -> dict[str, Any]:
    return {"status": "up", "utilization": 0}


def _overall_status(checks: dict[str, Any]) -> str:
    statuses = [c.get("status", "unknown") for c in checks.values()]
    if all(s == "up" for s in statuses):
        return "healthy"
    if any(s == "down" for s in statuses):
        return "unhealthy"
    return "degraded"


@router.get("")
async def health_liveness() -> dict[str, Any]:
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": round(time.monotonic() - _START_TIME, 1),
    }


@router.get("/ready")
async def health_readiness() -> dict[str, Any]:
    checks = {
        "database": await _check_database(),
        "redis": await _check_redis(),
        "gpu": await _check_gpu(),
    }
    return {
        "status": _overall_status(checks),
        "version": "1.0.0",
        "uptime_seconds": round(time.monotonic() - _START_TIME, 1),
        "checks": checks,
    }


@router.get("/detailed")
async def health_detailed() -> dict[str, Any]:
    checks = {
        "database": await _check_database(),
        "redis": await _check_redis(),
        "gpu": await _check_gpu(),
    }
    return {
        "status": _overall_status(checks),
        "version": "1.0.0",
        "uptime_seconds": round(time.monotonic() - _START_TIME, 1),
        "checks": checks,
    }
