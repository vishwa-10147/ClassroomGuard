import csv
import io
from datetime import UTC, datetime, timedelta

from backend.app.api.dependencies import get_db, require_permission
from backend.app.models.alert import Alert
from backend.app.models.camera import Camera
from backend.app.models.classroom import Classroom
from backend.app.models.detection_event import DetectionEvent
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/v1/reports", tags=["Reports"])


def _period(start_date: str | None, end_date: str | None) -> tuple[datetime, datetime]:
    """Report window; date-only end dates include the whole day. Defaults to the last 7 days."""
    now = datetime.now(UTC)
    end = datetime.fromisoformat(end_date) if end_date else now
    if end_date and len(end_date) <= 10:
        end = end + timedelta(days=1)
    start = datetime.fromisoformat(start_date) if start_date else end - timedelta(days=7)
    if start.tzinfo is None:
        start = start.replace(tzinfo=UTC)
    if end.tzinfo is None:
        end = end.replace(tzinfo=UTC)
    return start, end


def _day_key(value) -> str:
    """Group-by day keys come back as date objects (PostgreSQL) or strings (SQLite)."""
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


async def _counts(db: AsyncSession, stmt) -> dict[str, int]:
    """Run a (key, count) GROUP BY query."""
    return {str(key): int(n) for key, n in (await db.execute(stmt)).all()}


@router.get("/generate")
async def generate_report(
    classroom_id: str | None = Query(None),
    start_date: str | None = Query(None, description="YYYY-MM-DD or ISO datetime"),
    end_date: str | None = Query(None, description="YYYY-MM-DD (inclusive) or ISO datetime"),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("reports:read")),
):
    """Exam monitoring summary for a period, optionally for one classroom."""
    start, end = _period(start_date, end_date)

    ev_filter = [DetectionEvent.timestamp >= start, DetectionEvent.timestamp < end]
    al_filter = [Alert.created_at >= start, Alert.created_at < end]
    if classroom_id:
        ev_filter.append(DetectionEvent.classroom_id == classroom_id)
        al_filter.append(Alert.classroom_id == classroom_id)

    by_type = await _counts(db, select(DetectionEvent.event_type, func.count()).where(*ev_filter).group_by(DetectionEvent.event_type))
    by_severity = await _counts(db, select(Alert.severity, func.count()).where(*al_filter).group_by(Alert.severity))
    by_status = await _counts(db, select(Alert.status, func.count()).where(*al_filter).group_by(Alert.status))

    ev_day = func.date(DetectionEvent.timestamp)
    events_by_day = {_day_key(d): n for d, n in (await db.execute(
        select(ev_day, func.count()).where(*ev_filter).group_by(ev_day)
    )).all()}
    al_day = func.date(Alert.created_at)
    alerts_by_day = {_day_key(d): n for d, n in (await db.execute(
        select(al_day, func.count()).where(*al_filter).group_by(al_day)
    )).all()}

    phone = DetectionEvent.event_type == "PHONE_USAGE"
    calc = DetectionEvent.event_type == "CALCULATOR_USAGE"
    rows = (await db.execute(
        select(
            Classroom.name,
            func.count(DetectionEvent.id),
            func.count(DetectionEvent.id).filter(phone),
            func.count(DetectionEvent.id).filter(calc),
        )
        .join(Classroom, DetectionEvent.classroom_id == Classroom.id)
        .where(*ev_filter)
        .group_by(Classroom.name)
        .order_by(func.count(DetectionEvent.id).desc())
    )).all()

    camera_query = select(Camera.status, func.count()).group_by(Camera.status)
    if classroom_id:
        camera_query = camera_query.where(Camera.classroom_id == classroom_id)
    cameras = await _counts(db, camera_query)

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat()},
        "totalEvents": sum(by_type.values()),
        "phoneDetections": by_type.get("PHONE_USAGE", 0),
        "calculatorDetections": by_type.get("CALCULATOR_USAGE", 0),
        "totalAlerts": sum(by_severity.values()),
        "alertsBySeverity": by_severity,
        "alertsResolved": by_status.get("resolved", 0),
        "alertsOpen": by_status.get("active", 0) + by_status.get("acknowledged", 0),
        "totalCameras": sum(cameras.values()),
        "camerasOnline": cameras.get("online", 0),
        "byDay": [
            {"date": d, "events": events_by_day.get(d, 0), "alerts": alerts_by_day.get(d, 0)}
            for d in sorted(set(events_by_day) | set(alerts_by_day))
        ],
        "byClassroom": [
            {"classroom": name, "events": total, "phone": ph, "calculator": ca}
            for name, total, ph, ca in rows
        ],
        "generatedAt": datetime.now(UTC).isoformat(),
    }


@router.get("/export/csv")
async def export_csv(
    classroom_id: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("reports:read")),
):
    """Detection events in the period with classroom and camera names (max 10,000 rows)."""
    start, end = _period(start_date, end_date)
    query = (
        select(DetectionEvent, Classroom.name, Camera.name)
        .join(Classroom, DetectionEvent.classroom_id == Classroom.id, isouter=True)
        .join(Camera, DetectionEvent.camera_id == Camera.id, isouter=True)
        .where(DetectionEvent.timestamp >= start, DetectionEvent.timestamp < end)
        .order_by(DetectionEvent.timestamp.desc())
        .limit(10000)
    )
    if classroom_id:
        query = query.where(DetectionEvent.classroom_id == classroom_id)
    rows = (await db.execute(query)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Time", "Detection", "Severity", "Classroom", "Camera", "Confidence", "Details"])
    for e, classroom_name, camera_name in rows:
        message = e.metadata_json.get("message", "") if isinstance(e.metadata_json, dict) else ""
        writer.writerow([
            e.timestamp.isoformat() if e.timestamp else "",
            e.event_type, e.severity, classroom_name or "", camera_name or "",
            f"{e.confidence:.2f}" if e.confidence is not None else "", message,
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=classroomguard-report.csv"},
    )


@router.get("/export/json")
async def export_json(
    classroom_id: str | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_permission("reports:read")),
):
    query = select(DetectionEvent).order_by(DetectionEvent.timestamp.desc())
    if classroom_id:
        query = query.where(DetectionEvent.classroom_id == classroom_id)
    start, end = _period(start_date, end_date)
    query = query.where(DetectionEvent.timestamp >= start, DetectionEvent.timestamp < end).limit(10000)

    result = await db.execute(query)
    events = result.scalars().all()

    import json
    data = []
    for e in events:
        data.append({
            "id": e.id,
            "type": e.event_type,
            "severity": e.severity,
            "classroom_id": e.classroom_id,
            "camera_id": e.camera_id,
            "seat_id": e.seat_id,
            "confidence": e.confidence,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        })

    return StreamingResponse(
        iter([json.dumps(data).encode()]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=report.json"},
    )
