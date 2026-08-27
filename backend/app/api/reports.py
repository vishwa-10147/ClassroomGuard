from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta
import io
import csv

from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.detection_event import DetectionEvent
from backend.app.models.alert import Alert
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


@router.get("/generate")
async def generate_report(
    classroom_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("reports:read")),
):
    event_query = select(func.count()).select_from(DetectionEvent)
    alert_query = select(func.count()).select_from(Alert)
    critical_query = select(func.count()).select_from(Alert).where(Alert.severity == "critical")
    camera_query = select(func.count()).select_from(Camera)

    if classroom_id:
        event_query = event_query.where(DetectionEvent.classroom_id == classroom_id)
        alert_query = alert_query.where(Alert.classroom_id == classroom_id)
        critical_query = critical_query.where(Alert.classroom_id == classroom_id)

    if start_date:
        sd = datetime.fromisoformat(start_date)
        event_query = event_query.where(DetectionEvent.timestamp >= sd)
        alert_query = alert_query.where(Alert.created_at >= sd)
        critical_query = critical_query.where(Alert.created_at >= sd)

    if end_date:
        ed = datetime.fromisoformat(end_date)
        event_query = event_query.where(DetectionEvent.timestamp <= ed)
        alert_query = alert_query.where(Alert.created_at <= ed)
        critical_query = critical_query.where(Alert.created_at <= ed)

    total_events = await db.scalar(event_query) or 0
    total_alerts = await db.scalar(alert_query) or 0
    critical_alerts = await db.scalar(critical_query) or 0
    total_cameras = await db.scalar(camera_query) or 0

    return {
        "totalEvents": total_events,
        "totalAlerts": total_alerts,
        "criticalAlerts": critical_alerts,
        "totalCameras": total_cameras,
        "generatedAt": datetime.utcnow().isoformat(),
    }


@router.get("/export/csv")
async def export_csv(
    classroom_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("reports:read")),
):
    query = select(DetectionEvent).order_by(DetectionEvent.timestamp.desc())
    if classroom_id:
        query = query.where(DetectionEvent.classroom_id == classroom_id)
    if start_date:
        query = query.where(DetectionEvent.timestamp >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.where(DetectionEvent.timestamp <= datetime.fromisoformat(end_date))
    query = query.limit(10000)

    result = await db.execute(query)
    events = result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Type", "Severity", "Classroom", "Camera", "Seat", "Confidence", "Timestamp"])
    for e in events:
        writer.writerow([
            e.id, e.event_type, e.severity, e.classroom_id or "",
            e.camera_id or "", e.seat_id or "", e.confidence or "",
            e.timestamp.isoformat() if e.timestamp else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=report.csv"},
    )


@router.get("/export/pdf")
async def export_pdf(
    classroom_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("reports:read")),
):
    event_query = select(func.count()).select_from(DetectionEvent)
    alert_query = select(func.count()).select_from(Alert)
    critical_query = select(func.count()).select_from(Alert).where(Alert.severity == "critical")

    if classroom_id:
        event_query = event_query.where(DetectionEvent.classroom_id == classroom_id)
        alert_query = alert_query.where(Alert.classroom_id == classroom_id)
        critical_query = critical_query.where(Alert.classroom_id == classroom_id)

    total_events = await db.scalar(event_query) or 0
    total_alerts = await db.scalar(alert_query) or 0
    critical_alerts = await db.scalar(critical_query) or 0

    report_text = f"""
ClassroomGuard Report
Generated: {datetime.utcnow().isoformat()}

Total Detection Events: {total_events}
Total Alerts: {total_alerts}
Critical Alerts: {critical_alerts}
"""
    return StreamingResponse(
        iter([report_text.encode()]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=report.pdf"},
    )
