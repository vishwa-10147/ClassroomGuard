import json
import os
import platform
import shutil
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from backend.app.api.dependencies import get_db, require_permission
from backend.app.core.audit import log_audit
from backend.app.core.database import engine
from backend.app.models.system_setting import SystemSetting
from backend.app.models.user import User
from backend.app.schemas.system_setting import (
    SettingBulkUpdate,
    SettingGroupResponse,
    SettingResponse,
    SettingUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["Settings"])

DEFAULT_SETTINGS = [
    {"key": "system_name", "value": "ClassroomGuard", "category": "general"},
    {"key": "system_version", "value": "1.0.0", "category": "general"},
    {"key": "data_retention_days", "value": "90", "category": "data"},
    {"key": "max_recordings_per_classroom", "value": "100", "category": "data"},
    {"key": "ai_confidence_threshold", "value": "0.75", "category": "ai"},
    {"key": "ai_model_version", "value": "yolov8n", "category": "ai"},
    {"key": "ai_processing_enabled", "value": "true", "category": "ai"},
    {"key": "notification_enabled", "value": "true", "category": "notifications"},
    {"key": "email_notifications", "value": "false", "category": "notifications"},
    {"key": "alert_sound_enabled", "value": "true", "category": "notifications"},
    {"key": "auto_resolve_alerts_hours", "value": "24", "category": "alerts"},
    {"key": "alert_severity_escalation", "value": "true", "category": "alerts"},
]


async def ensure_default_settings(db: AsyncSession) -> None:
    result = await db.execute(select(SystemSetting))
    existing = {s.key for s in result.scalars().all()}
    for setting in DEFAULT_SETTINGS:
        if setting["key"] not in existing:
            db.add(SystemSetting(
                key=setting["key"],
                value=json.dumps(setting["value"]),
                category=setting["category"],
            ))
    await db.commit()


@router.get("/settings", response_model=list[SettingGroupResponse])
async def list_settings(
    _user: User = Depends(require_permission("settings:read")),
    db: AsyncSession = Depends(get_db),
):
    await ensure_default_settings(db)
    result = await db.execute(select(SystemSetting).order_by(SystemSetting.category, SystemSetting.key))
    settings = result.scalars().all()

    groups: dict[str, list[SettingResponse]] = {}
    for s in settings:
        groups.setdefault(s.category, []).append(
            SettingResponse(key=s.key, value=s.value, category=s.category, updated_at=s.updated_at)
        )

    return [SettingGroupResponse(category=cat, settings=items) for cat, items in groups.items()]


@router.get("/settings/{key}", response_model=SettingResponse)
async def get_setting(
    key: str,
    _user: User = Depends(require_permission("settings:read")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    if setting is None:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")
    return setting


@router.put("/settings", response_model=list[SettingResponse])
async def bulk_update_settings(
    request: Request,
    body: SettingBulkUpdate,
    _user: User = Depends(require_permission("settings:write")),
    db: AsyncSession = Depends(get_db),
):
    updated = []
    old_values = {}
    new_values = {}
    for item in body.settings:
        result = await db.execute(select(SystemSetting).where(SystemSetting.key == item.key))
        setting = result.scalar_one_or_none()
        old_val = setting.value if setting else None
        if setting is None:
            setting = SystemSetting(key=item.key, value=json.dumps(item.value), category="general")
            db.add(setting)
        else:
            setting.value = json.dumps(item.value)
            setting.updated_at = datetime.now(timezone.utc)
        old_values[item.key] = old_val
        new_values[item.key] = json.dumps(item.value)
        await db.flush()
        await db.refresh(setting)
        updated.append(setting)
    await log_audit(
        db, _user, "update", "settings",
        old_value=old_values,
        new_value=new_values,
        request=request,
    )
    await db.commit()
    return updated


# ── System Health ────────────────────────────────────────────────────────────


def _get_gpu_info() -> dict[str, Any]:
    try:
        import subprocess
        out = subprocess.check_output(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.used,memory.free,temperature.gpu,utilization.gpu",
             "--format=csv,noheader,nounits"],
            timeout=5,
            stderr=subprocess.DEVNULL,
        ).decode().strip()
        if not out:
            return {"available": False, "gpus": []}
        gpus = []
        for line in out.splitlines():
            parts = [p.strip() for p in line.split(",")]
            if len(parts) >= 6:
                gpus.append({
                    "name": parts[0],
                    "memory_total_mb": int(parts[1]),
                    "memory_used_mb": int(parts[2]),
                    "memory_free_mb": int(parts[3]),
                    "temperature_c": int(parts[4]),
                    "utilization_pct": int(parts[5]),
                })
        return {"available": True, "gpus": gpus}
    except Exception:
        return {"available": False, "gpus": [], "note": "nvidia-smi not available"}


def _get_storage_info() -> dict[str, Any]:
    try:
        usage = shutil.disk_usage("/")
        return {
            "total_gb": round(usage.total / (1024**3), 2),
            "used_gb": round(usage.used / (1024**3), 2),
            "free_gb": round(usage.free / (1024**3), 2),
            "percent_used": round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        return {"error": "Unable to retrieve storage info"}


@router.get("/system/health")
async def system_health(
    _user: User = Depends(require_permission("settings:read")),
    db: AsyncSession = Depends(get_db),
):
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "gpu": _get_gpu_info(),
        "storage": _get_storage_info(),
        "platform": {
            "system": platform.system(),
            "release": platform.release(),
            "python": platform.python_version(),
        },
    }
