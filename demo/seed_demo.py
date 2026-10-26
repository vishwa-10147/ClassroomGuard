"""Exam-hall demo data for the screen-recorded walkthrough (demo/record-demo.mjs).

Run on an empty demo database after `python -m backend.seed_users`:

    python demo/seed_demo.py

Never run it on a production server. The evidence images it refers to are drawn by
demo/record-demo.mjs (they are illustrations, not footage).
"""

import asyncio
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.core.database import AsyncSessionLocal, init_db  # noqa: E402
from backend.app.models.alert import Alert  # noqa: E402
from backend.app.models.camera import Camera  # noqa: E402
from backend.app.models.classroom import Classroom  # noqa: E402
from backend.app.models.detection_event import DetectionEvent  # noqa: E402
from backend.app.models.incident import Incident  # noqa: E402
from backend.app.models.organization import Organization  # noqa: E402
from backend.app.models.recording import Recording  # noqa: E402
from backend.app.models.user import User  # noqa: E402
from sqlalchemy import select  # noqa: E402

ROWS = "ABCD"
W, H = 1600, 900


def seat_zone(seat: str) -> dict:
    """Same geometry as seatZone() in demo/scene.mjs."""
    cx = 250 + (int(seat[1:]) - 1) * 220
    cy = 330 + ROWS.index(seat[0]) * 145
    return {
        "id": f"seat-{seat}", "type": "seat", "label": seat,
        "x": round((cx - 100) / W, 4), "y": round((cy - 62) / H, 4),
        "w": round(200 / W, 4), "h": round(132 / H, 4),
    }


# Hall A camera 1: every desk but D6 has a seat zone (D6 is drawn live in the video)
HALL_A_ZONES = [seat_zone(f"{r}{c}") for r in ROWS for c in range(1, 7) if f"{r}{c}" != "D6"]
HALL_B_ZONES = [seat_zone(f"{r}{c}") for r in ROWS for c in range(1, 7)] + [
    {"id": "inv-desk", "type": "ignore", "label": "Invigilator desk", "x": 0.375, "y": 0.0444, "w": 0.25, "h": 0.2111},
]

CLASSROOMS = [
    ("hall-a", "Exam Hall A", "Block 3", 1, "A-101", 48),
    ("hall-b", "Exam Hall B", "Block 3", 2, "B-204", 60),
    ("drawing", "Drawing Hall", "Block 1", 0, "D-01", 40),
]

CAMERAS = [
    # id, name, code, room, status, fps, zones
    ("cam-ha1", "Hall A - Front", "HA-CAM1", "hall-a", "online", 20, HALL_A_ZONES),
    ("cam-ha2", "Hall A - Rear", "HA-CAM2", "hall-a", "online", 20, None),
    ("cam-hb1", "Hall B - Front", "HB-CAM1", "hall-b", "online", 20, HALL_B_ZONES),
    ("cam-hb2", "Hall B - Rear", "HB-CAM2", "hall-b", "offline", 0, None),
    ("cam-dh1", "Drawing Hall", "DH-CAM1", "drawing", "online", 15, None),
]


async def main() -> None:
    await init_db()
    async with AsyncSessionLocal() as db:
        if (await db.execute(select(Classroom).limit(1))).scalar_one_or_none():
            print("Demo data already exists.")
            return
        users = {u.role: u for u in (await db.execute(select(User))).scalars().all()}
        org_id = users["admin"].organization_id
        org = await db.get(Organization, org_id)
        org.name = "Demo College of Engineering"
        now = datetime.now(UTC)

        for cid, name, building, floor, room, seats in CLASSROOMS:
            db.add(Classroom(id=cid, name=name, building=building, floor=floor, room_number=room,
                             total_seats=seats, organization_id=org_id))
        await db.flush()
        for cam_id, name, code, room, status, fps, zones in CAMERAS:
            db.add(Camera(id=cam_id, name=name, camera_id=code, classroom_id=room, status=status, fps=fps,
                          resolution="1920x1080", ai_processing=status == "online", ai_model="exam_detector",
                          zones=zones, organization_id=org_id))
        await db.flush()

        # A recording analysed last week, with the detections it produced
        rec = Recording(
            id="rec-midterm-b", name="Physics mid-term - Hall B (22 Oct)", filename="demo-hall-b-midterm.mp4",
            classroom_id="hall-b", camera_id="cam-hb1", duration=5400, file_size=812_000_000,
            processing_state="completed", processing_progress=100, current_frame=54000, total_frames=54000,
            detection_count=37, event_count=2, uploaded_at=now - timedelta(days=4),
            processed_at=now - timedelta(days=4, hours=-1), organization_id=org_id,
        )
        db.add(rec)
        await db.flush()

        def event(eid, kind, sev, room, cam, seat, conf, when, image, message, recording=None, video_t=None):
            meta = {"message": message, "evidence_path": f"storage/evidence/{image}"}
            if video_t is not None:
                meta["video_time_s"] = video_t
            return DetectionEvent(
                id=eid, event_type=kind, severity=sev, classroom_id=room, camera_id=cam, seat_id=seat,
                confidence=conf, tracker_id=7, metadata_json=meta, timestamp=when, recording_id=recording,
                organization_id=org_id,
            )

        db.add_all([
            event("evt-calc-c2", "CALCULATOR_USAGE", "medium", "hall-b", "cam-hb1", "C2", 0.87,
                  now - timedelta(hours=2, minutes=14), "demo-hall-b-calculator-c2.jpg",
                  "Calculator at desk for 1.6s"),
            event("evt-phone-a5", "PHONE_USAGE", "high", "hall-a", "cam-ha1", "A5", 0.92,
                  now - timedelta(days=1, hours=3), "demo-hall-a-phone-a5.jpg", "Cell phone in hand for 1.1s"),
            event("evt-rec-d3", "PHONE_USAGE", "high", "hall-b", "cam-hb1", "D3", 0.9,
                  now - timedelta(days=4), "demo-hall-b-phone-d3.jpg",
                  "Cell phone in hand for 1.4s at 41:12 in the recording", rec.id, 2472),
            event("evt-rec-a1", "PHONE_USAGE", "medium", "hall-b", "cam-hb1", "A1", 0.88,
                  now - timedelta(days=4), "demo-hall-b-phone-a1.jpg",
                  "Cell phone at desk for 2.0s at 1:07:45 in the recording", rec.id, 4065),
        ])
        await db.flush()

        db.add_all([
            Alert(id="alt-calc-c2", title="Calculator detected - Exam Hall B",
                  description="Calculator at desk for 1.6s (camera: Hall B - Front)", severity="medium",
                  status="acknowledged", classroom_id="hall-b", camera_id="cam-hb1", event_id="evt-calc-c2",
                  acknowledged_by=users["security"].id, acknowledged_at=now - timedelta(hours=2, minutes=12),
                  created_at=now - timedelta(hours=2, minutes=14), organization_id=org_id),
            Alert(id="alt-phone-a5", title="Mobile phone detected - Exam Hall A",
                  description="Cell phone in hand for 1.1s (camera: Hall A - Front)", severity="high",
                  status="resolved", classroom_id="hall-a", camera_id="cam-ha1", event_id="evt-phone-a5",
                  resolved_by=users["security"].id, resolved_at=now - timedelta(days=1, hours=2),
                  created_at=now - timedelta(days=1, hours=3), organization_id=org_id),
            Alert(id="alt-cam-hb2", title="Camera offline - Hall B - Rear",
                  description="No video from Hall B - Rear for 5 minutes", severity="medium", status="active",
                  classroom_id="hall-b", camera_id="cam-hb2", created_at=now - timedelta(minutes=48),
                  organization_id=org_id),
        ])
        db.add(Incident(
            id="inc-calc-c2", title="Calculator in Physics mid-term (Hall B, seat C2)",
            description="Calculators were not allowed in this paper. The invigilator confirmed a calculator on the "
                        "desk at seat C2 and took it into custody.",
            severity="medium", status="investigating", classroom_id="hall-b", camera_id="cam-hb1",
            assigned_to=users["security"].id, event_ids=["evt-calc-c2"],
            notes=[{"id": "n1", "text": "Calculator handed in; student allowed to continue.",
                    "author": users["security"].name, "authorId": users["security"].id,
                    "timestamp": (now - timedelta(hours=2)).isoformat()}],
            created_at=now - timedelta(hours=2, minutes=5), organization_id=org_id,
        ))
        await db.commit()
        print("Demo data ready.")


if __name__ == "__main__":
    asyncio.run(main())
