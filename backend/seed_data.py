import asyncio
from uuid import uuid4
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from backend.app.core.database import init_db, AsyncSessionLocal
from backend.app.models.user import User
from backend.app.models.classroom import Classroom
from backend.app.models.camera import Camera
from backend.app.models.detection_event import DetectionEvent
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident
from backend.app.models.recording import Recording


CLASSROOMS = [
    {
        "id": "cls-001",
        "name": "CS 101 - Intro to Programming",
        "building": "Engineering",
        "floor": 1,
        "room_number": "101",
        "total_seats": 60,
    },
    {
        "id": "cls-002",
        "name": "CS 301 - Machine Learning",
        "building": "Engineering",
        "floor": 3,
        "room_number": "301",
        "total_seats": 45,
    },
    {
        "id": "cls-003",
        "name": "MATH 202 - Linear Algebra",
        "building": "Science",
        "floor": 2,
        "room_number": "202",
        "total_seats": 80,
    },
]

CAMERAS = [
    {"id": "cam-001", "name": "Front Left", "camera_id": "CAM-FRONT-L", "classroom_id": "cls-001", "status": "online", "fps": 30, "resolution": "1920x1080", "ai_processing": True, "ai_model": "yolov8m"},
    {"id": "cam-002", "name": "Front Right", "camera_id": "CAM-FRONT-R", "classroom_id": "cls-001", "status": "online", "fps": 30, "resolution": "1920x1080", "ai_processing": True, "ai_model": "yolov8m"},
    {"id": "cam-003", "name": "Main Camera", "camera_id": "CAM-MAIN", "classroom_id": "cls-002", "status": "online", "fps": 25, "resolution": "1280x720", "ai_processing": True, "ai_model": "yolov8m"},
    {"id": "cam-004", "name": "Side Camera", "camera_id": "CAM-SIDE", "classroom_id": "cls-002", "status": "offline", "fps": 0, "resolution": "1920x1080", "ai_processing": False},
    {"id": "cam-005", "name": "Overview", "camera_id": "CAM-OVERVIEW", "classroom_id": "cls-003", "status": "online", "fps": 30, "resolution": "1920x1080", "ai_processing": True, "ai_model": "yolov8m-pose"},
    {"id": "cam-006", "name": "Close-up", "camera_id": "CAM-CLOSE", "classroom_id": "cls-003", "status": "connecting", "fps": 0, "resolution": "1920x1080", "ai_processing": False},
]

EVENTS = [
    {"id": "evt-001", "event_type": "PHONE_USAGE_DETECTED", "severity": "high", "classroom_id": "cls-001", "camera_id": "cam-001", "seat_id": "S015", "confidence": 0.92, "tracker_id": 3, "bounding_box": {"x": 120, "y": 240, "w": 80, "h": 60}, "metadata_json": {"object_class": "cell_phone", "duration_frames": 12}},
    {"id": "evt-002", "event_type": "PERSON_ENTERED", "severity": "info", "classroom_id": "cls-001", "camera_id": "cam-002", "confidence": 0.88, "tracker_id": 7, "metadata_json": {"action": "entered"}},
    {"id": "evt-003", "event_type": "PHONE_USAGE_DETECTED", "severity": "critical", "classroom_id": "cls-002", "camera_id": "cam-003", "seat_id": "S008", "confidence": 0.97, "tracker_id": 1, "bounding_box": {"x": 340, "y": 180, "w": 70, "h": 55}, "metadata_json": {"object_class": "cell_phone", "duration_frames": 45}},
    {"id": "evt-004", "event_type": "UNAUTHORIZED_ACCESS", "severity": "critical", "classroom_id": "cls-003", "camera_id": "cam-005", "confidence": 0.85, "tracker_id": 12, "metadata_json": {"reason": "after_hours"}},
    {"id": "evt-005", "event_type": "CAMERA_OFFLINE", "severity": "medium", "classroom_id": "cls-002", "camera_id": "cam-004", "metadata_json": {"reason": "network_timeout"}},
    {"id": "evt-006", "event_type": "PHONE_USAGE_DETECTED", "severity": "high", "classroom_id": "cls-001", "camera_id": "cam-001", "seat_id": "S022", "confidence": 0.89, "tracker_id": 5, "bounding_box": {"x": 450, "y": 300, "w": 75, "h": 58}, "metadata_json": {"object_class": "calculator", "duration_frames": 8}},
    {"id": "evt-007", "event_type": "PERSON_EXITED", "severity": "info", "classroom_id": "cls-003", "camera_id": "cam-005", "confidence": 0.91, "tracker_id": 9, "metadata_json": {"action": "exited"}},
    {"id": "evt-008", "event_type": "CAMERA_ONLINE", "severity": "info", "classroom_id": "cls-002", "camera_id": "cam-004", "metadata_json": {"reason": "reconnected"}},
]

ALERTS = [
    {"id": "alt-001", "title": "Phone Detected - Row C", "description": "Student at seat S015 using cell phone during lecture", "severity": "high", "status": "active", "classroom_id": "cls-001", "camera_id": "cam-001", "event_id": "evt-001"},
    {"id": "alt-002", "title": "Phone Detected - Seat 8", "description": "Student at seat S008 using cell phone extensively (45 frames)", "severity": "critical", "status": "acknowledged", "classroom_id": "cls-002", "camera_id": "cam-003", "event_id": "evt-003", "ack_by_role": "admin"},
    {"id": "alt-003", "title": "Calculator Usage Detected", "description": "Possible calculator usage at seat S022 in CS 101", "severity": "high", "status": "active", "classroom_id": "cls-001", "camera_id": "cam-001", "event_id": "evt-006"},
    {"id": "alt-004", "title": "Camera Offline", "description": "Side Camera in CS 301 has gone offline", "severity": "medium", "status": "active", "classroom_id": "cls-002", "camera_id": "cam-004", "event_id": "evt-005"},
    {"id": "alt-005", "title": "After-Hours Access", "description": "Unauthorized person detected in MATH 202 after hours", "severity": "critical", "status": "resolved", "classroom_id": "cls-003", "camera_id": "cam-005", "event_id": "evt-004", "resolved_by_role": "security"},
]

INCIDENTS = [
    {"id": "inc-001", "title": "Repeated Phone Usage in CS 101", "description": "Multiple phone detection events in CS 101 during midterm. Student at S015 and S022 flagged repeatedly.", "severity": "high", "status": "investigating", "classroom_id": "cls-001", "camera_id": "cam-001", "event_ids": ["evt-001", "evt-006"]},
    {"id": "inc-002", "title": "Camera System Failure", "description": "Side Camera in CS 301 went offline during lecture. Network issue suspected.", "severity": "medium", "status": "open", "classroom_id": "cls-002", "camera_id": "cam-004", "event_ids": ["evt-005"]},
]

RECORDINGS = [
    {"id": "rec-001", "name": "CS 101 - Mon AM", "filename": "cs101_20260825_am.mp4", "classroom_id": "cls-001", "camera_id": "cam-001", "duration": 5400.0, "file_size": 1250000000, "processing_state": "completed", "processing_progress": 100, "current_frame": 162000, "total_frames": 162000, "detection_count": 24, "event_count": 3},
    {"id": "rec-002", "name": "CS 301 - Mon AM", "filename": "cs301_20260825_am.mp4", "classroom_id": "cls-002", "camera_id": "cam-003", "duration": 3600.0, "file_size": 890000000, "processing_state": "processing", "processing_progress": 65, "current_frame": 58500, "total_frames": 90000, "detection_count": 12, "event_count": 2},
    {"id": "rec-003", "name": "MATH 202 - Mon PM", "filename": "math202_20260825_pm.mp4", "classroom_id": "cls-003", "camera_id": "cam-005", "duration": 2700.0, "file_size": 650000000, "processing_state": "queued", "processing_progress": 0, "current_frame": 0, "total_frames": 81000},
]


async def seed_data():
    await init_db()
    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # Check if data already exists
        existing = await db.execute(select(Classroom).limit(1))
        if existing.scalar_one_or_none():
            print("Data already exists. Skipping seed.")
            return

        # Get user IDs for foreign keys
        users_result = await db.execute(select(User))
        users = {u.role: u.id for u in users_result.scalars().all()}
        super_admin_id = users.get("super_admin", "unknown")
        security_id = users.get("security", "unknown")

        # Create classrooms
        for c in CLASSROOMS:
            classroom = Classroom(
                id=c["id"],
                name=c["name"],
                building=c["building"],
                floor=c["floor"],
                room_number=c["room_number"],
                total_seats=c["total_seats"],
            )
            db.add(classroom)
        await db.flush()
        print(f"  [created] {len(CLASSROOMS)} classrooms")

        # Create cameras
        for c in CAMERAS:
            camera = Camera(
                id=c["id"],
                name=c["name"],
                camera_id=c["camera_id"],
                classroom_id=c["classroom_id"],
                status=c["status"],
                fps=c["fps"],
                resolution=c["resolution"],
                ai_processing=c["ai_processing"],
                ai_model=c.get("ai_model"),
            )
            db.add(camera)
        await db.flush()
        print(f"  [created] {len(CAMERAS)} cameras")

        # Create events
        for i, e in enumerate(EVENTS):
            event = DetectionEvent(
                id=e["id"],
                event_type=e["event_type"],
                severity=e["severity"],
                classroom_id=e["classroom_id"],
                camera_id=e["camera_id"],
                seat_id=e.get("seat_id"),
                confidence=e.get("confidence"),
                tracker_id=e.get("tracker_id"),
                bounding_box=e.get("bounding_box"),
                metadata_json=e.get("metadata_json"),
                timestamp=now - timedelta(hours=len(EVENTS) - i),
            )
            db.add(event)
        await db.flush()
        print(f"  [created] {len(EVENTS)} detection events")

        # Create alerts
        for a in ALERTS:
            alert = Alert(
                id=a["id"],
                title=a["title"],
                description=a["description"],
                severity=a["severity"],
                status=a["status"],
                classroom_id=a.get("classroom_id"),
                camera_id=a.get("camera_id"),
                event_id=a.get("event_id"),
                acknowledged_by=users.get(a["ack_by_role"]) if a.get("ack_by_role") else None,
                acknowledged_at=now - timedelta(hours=2) if a["status"] != "active" else None,
                resolved_by=users.get(a["resolved_by_role"]) if a.get("resolved_by_role") else None,
                resolved_at=now - timedelta(hours=1) if a["status"] == "resolved" else None,
            )
            db.add(alert)
        await db.flush()
        print(f"  [created] {len(ALERTS)} alerts")

        # Create incidents
        for inc in INCIDENTS:
            incident = Incident(
                id=inc["id"],
                title=inc["title"],
                description=inc["description"],
                severity=inc["severity"],
                status=inc["status"],
                classroom_id=inc.get("classroom_id"),
                camera_id=inc.get("camera_id"),
                assigned_to=security_id if inc["status"] == "investigating" else None,
                event_ids=inc.get("event_ids"),
            )
            db.add(incident)
        await db.flush()
        print(f"  [created] {len(INCIDENTS)} incidents")

        # Create recordings
        for r in RECORDINGS:
            recording = Recording(
                id=r["id"],
                name=r["name"],
                filename=r["filename"],
                classroom_id=r.get("classroom_id"),
                camera_id=r.get("camera_id"),
                duration=r["duration"],
                file_size=r["file_size"],
                processing_state=r["processing_state"],
                processing_progress=r["processing_progress"],
                current_frame=r["current_frame"],
                total_frames=r["total_frames"],
                detection_count=r.get("detection_count", 0),
                event_count=r.get("event_count", 0),
            )
            db.add(recording)
        await db.flush()
        print(f"  [created] {len(RECORDINGS)} recordings")

        await db.commit()
        print(f"\nDone. Seed data created successfully.")


if __name__ == "__main__":
    asyncio.run(seed_data())
