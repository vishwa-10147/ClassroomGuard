from datetime import UTC, datetime

from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.alert import Alert
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/stats")
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("alerts:read")),
):
    """Summary counts for the caller's organisation (used by the mobile Dashboard tab)."""
    org_id = _user.organization_id
    if not org_id:
        raise HTTPException(status_code=403, detail="User is not associated with an organization")

    async def count(model, *conditions) -> int:
        return await db.scalar(
            select(func.count()).select_from(model).where(model.organization_id == org_id, *conditions)
        ) or 0

    start_of_day = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
    return {
        "total_cameras": await count(Camera),
        "active_cameras": await count(Camera, Camera.status == "online"),
        "total_classrooms": await count(Classroom),
        "active_alerts": await count(Alert, Alert.status == "active"),
        "total_alerts_today": await count(Alert, Alert.created_at >= start_of_day),
    }
