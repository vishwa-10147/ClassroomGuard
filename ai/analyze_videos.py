"""
ClassroomGuard - Test Video Analysis Script
Processes test videos through YOLOv8m detection + pose on GPU,
generates cheating alerts, and seeds the backend database via API.
"""
import asyncio
import json
import logging
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import cv2
import numpy as np
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ultralytics import YOLO

from src.tracker import ByteTracker
from src.gaze_estimator import GazeEstimator
from src.false_positive_filter import FalsePositiveFilter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("analyze_videos")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "ai" / "models"
STORAGE_EVIDENCE = PROJECT_ROOT / "storage" / "evidence"
STORAGE_FRAMES = PROJECT_ROOT / "storage" / "frames"
BACKEND_URL = "http://localhost:8000"

STORAGE_EVIDENCE.mkdir(parents=True, exist_ok=True)
STORAGE_FRAMES.mkdir(parents=True, exist_ok=True)

TEST_VIDEOS = [
    {"path": PROJECT_ROOT / "test_data" / "test1.mp4", "label": "test1_mp4"},
    {"path": PROJECT_ROOT / "test_data" / "test2.mp4", "label": "test2_mp4"},
    {"path": PROJECT_ROOT / "test_data" / "test1.avi", "label": "test1_avi"},
]

DEVICE = 0
CONF_DET = 0.3
CONF_POSE = 0.5
IMG_SIZE = 640
SAMPLE_EVERY = 3
WINDOW_SIZE = 15
PHONE_THRESHOLD = 5
CALC_THRESHOLD = 4
HEAD_TURN_THRESHOLD = 1.5
LOOKING_DOWN_THRESHOLD = 1.0
COOLDOWN_S = 5.0


class StudentState:
    def __init__(self):
        self.window = {
            "phone": [False] * WINDOW_SIZE,
            "calc": [False] * WINDOW_SIZE,
            "head_turn": [False] * WINDOW_SIZE,
            "looking_down": [False] * WINDOW_SIZE,
        }
        self.last_alerts = {}
        self.alert_count = defaultdict(int)

    def push(self, key, detected):
        self.window[key].append(detected)
        if len(self.window[key]) > WINDOW_SIZE:
            self.window[key].pop(0)

    def count(self, key):
        return sum(self.window[key])

    def check_cooldown(self, alert_type, now, cooldown=COOLDOWN_S):
        last = self.last_alerts.get(alert_type, 0)
        if now - last < cooldown:
            return False
        self.last_alerts[alert_type] = now
        return True


def draw_detections(frame, detections):
    annotated = frame.copy()
    colors = {
        "person": (0, 255, 0),
        "cell phone": (0, 0, 255),
        "cell_phone": (0, 0, 255),
        "calculator": (255, 165, 0),
    }
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        cls = det["class_name"]
        conf = det["confidence"]
        color = colors.get(cls, (255, 255, 255))
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
        label = f"{cls} {conf:.2f}"
        (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(annotated, (x1, y1 - h - 6), (x1 + w, y1), color, -1)
        cv2.putText(annotated, label, (x1, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
    return annotated


def save_evidence(frame, video_label, frame_idx, alert_type=""):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = f"{ts}_{video_label}_f{frame_idx:06d}_{alert_type}_evidence.jpg"
    filepath = STORAGE_EVIDENCE / fname
    cv2.imwrite(str(filepath), frame)
    return str(filepath)


def analyze_video(video_path, detector, pose_model, tracker, gaze_estimator, fp_filter):
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        logger.error("Cannot open %s", video_path)
        return {"events": [], "alerts": [], "stats": {}}

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps_rate = cap.get(cv2.CAP_PROP_FPS) or 24.0
    logger.info("Video: %s (%d frames @ %.1f FPS)", video_path.name, total_frames, fps_rate)

    student_states = {}
    events = []
    alerts = []
    video_label = video_path.stem
    frame_idx = 0
    t_start = time.time()

    try:
        from tqdm import tqdm
        pbar = tqdm(total=total_frames, desc=f"  {video_label}", unit="frame", leave=True)
    except ImportError:
        pbar = None

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        if pbar:
            pbar.update(1)

        if frame_idx % SAMPLE_EVERY != 0:
            frame_idx += 1
            continue

        video_time = frame_idx / fps_rate

        # Detection with false-positive filtering
        results_det = detector.predict(
            source=frame, conf=CONF_DET, iou=0.45,
            imgsz=IMG_SIZE, device=DEVICE, quantize="fp16", verbose=False,
        )
        results_pose = pose_model.predict(
            source=frame, conf=CONF_POSE,
            imgsz=IMG_SIZE, device=DEVICE, quantize="fp16", verbose=False,
        )

        persons = []
        objects = []
        for r in results_det:
            if r.boxes is None:
                continue
            boxes = r.boxes.xyxy.cpu().numpy()
            confs = r.boxes.conf.cpu().numpy()
            classes = r.boxes.cls.cpu().numpy().astype(int)
            names = r.names if hasattr(r, "names") else detector.names
            for box, c, cls_id in zip(boxes, confs, classes):
                cls_name = names.get(int(cls_id), "unknown")
                det = {
                    "bbox": box.astype(int).tolist(),
                    "confidence": float(c),
                    "class_id": int(cls_id),
                    "class_name": cls_name,
                }
                if cls_name == "person":
                    persons.append(det)
                else:
                    objects.append(det)

        # False-positive filtering
        persons = fp_filter.filter_detections(persons)
        objects = fp_filter.filter_detections(objects)

        poses = []
        for r in results_pose:
            if r.keypoints is None:
                continue
            kpts = r.keypoints.xy.cpu().numpy()
            boxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else []
            for i, person_kpts in enumerate(kpts):
                box = boxes[i].astype(int).tolist() if i < len(boxes) else [0, 0, 0, 0]
                poses.append({"keypoints": person_kpts.tolist(), "bbox": box})

        # ByteTracker update
        tracked = tracker.update(persons)

        for track in tracked:
            pid = track.track_id
            state = student_states.setdefault(pid, StudentState())

            # Match pose to track
            best_pose_iou = 0
            best_pose = None
            for pose in poses:
                x1 = max(track.bbox[0], pose["bbox"][0])
                y1 = max(track.bbox[1], pose["bbox"][1])
                x2 = min(track.bbox[2], pose["bbox"][2])
                y2 = min(track.bbox[3], pose["bbox"][3])
                inter = max(0, x2 - x1) * max(0, y2 - y1)
                area_a = (track.bbox[2] - track.bbox[0]) * (track.bbox[3] - track.bbox[1])
                area_b = (pose["bbox"][2] - pose["bbox"][0]) * (pose["bbox"][3] - pose["bbox"][1])
                union = area_a + area_b - inter
                io = inter / union if union > 0 else 0
                if io > best_pose_iou:
                    best_pose_iou = io
                    best_pose = pose

            head_direction = "forward"
            yaw_val = 0.0
            pitch_val = 0.0
            hands_up = False

            if best_pose and best_pose_iou > 0.3:
                kpts = best_pose["keypoints"]
                head_pose = gaze_estimator.estimate_head_pose(kpts)
                head_direction = head_pose.direction
                yaw_val = head_pose.yaw
                pitch_val = head_pose.pitch

                if len(kpts) > 10:
                    ls = kpts[5] if len(kpts) > 5 else [0, 0]
                    rs = kpts[6] if len(kpts) > 6 else [0, 0]
                    lw = kpts[9] if len(kpts) > 9 else [0, 0]
                    rw = kpts[10] if len(kpts) > 10 else [0, 0]
                    if all(p[0] != 0 or p[1] != 0 for p in [ls, rs, lw, rw]):
                        shoulder_cy = (ls[1] + rs[1]) / 2
                        wrist_cy = (lw[1] + rw[1]) / 2
                        hands_up = wrist_cy < shoulder_cy - 30

            # Phone proximity
            phone_dets = [d for d in objects if d["class_name"] == "cell phone"]
            phone_near = False
            if phone_dets:
                phone_bbox = phone_dets[0]["bbox"]
                px_cx = (phone_bbox[0] + phone_bbox[2]) / 2
                px_cy = (phone_bbox[1] + phone_bbox[3]) / 2
                person_cx = (track.bbox[0] + track.bbox[2]) / 2
                person_cy = (track.bbox[1] + track.bbox[3]) / 2
                dist = ((px_cx - person_cx)**2 + (px_cy - person_cy)**2)**0.5
                phone_near = dist < 150

            state.push("phone", phone_near)
            state.push("calc", any(d["class_name"] == "calculator" for d in objects))
            state.push("head_turn", head_direction in ("left", "right"))
            state.push("looking_down", head_direction == "down")

            now = time.time()
            annotated = None

            phone_count = state.count("phone")
            if phone_count >= PHONE_THRESHOLD and state.check_cooldown("phone", now):
                annotated = draw_detections(frame, persons + objects)
                evidence_path = save_evidence(annotated, video_label, frame_idx, "phone")
                alert = {
                    "type": "PHONE_USAGE_DETECTED",
                    "severity": "high",
                    "title": f"Phone detected near student in {phone_count}/{WINDOW_SIZE} frames",
                    "description": f"Student (tracker #{pid}) using phone at {video_time:.1f}s",
                    "metadata": {"tracker_id": pid, "frame": frame_idx, "video_time": video_time, "evidence_path": evidence_path},
                }
                alerts.append(alert)
                state.alert_count["phone"] += 1

            calc_count = state.count("calc")
            if calc_count >= CALC_THRESHOLD and state.check_cooldown("calculator", now):
                if annotated is None:
                    annotated = draw_detections(frame, persons + objects)
                evidence_path = save_evidence(annotated, video_label, frame_idx, "calculator")
                alert = {
                    "type": "CALCULATOR_USAGE_DETECTED",
                    "severity": "medium",
                    "title": "Calculator detected (not in allowed section)",
                    "description": f"Student (tracker #{pid}) using calculator at {video_time:.1f}s",
                    "metadata": {"tracker_id": pid, "frame": frame_idx, "video_time": video_time, "evidence_path": evidence_path},
                }
                alerts.append(alert)
                state.alert_count["calculator"] += 1

            head_count = state.count("head_turn")
            head_duration = head_count * SAMPLE_EVERY / fps_rate
            if head_duration >= HEAD_TURN_THRESHOLD and state.check_cooldown("head_turn", now):
                if annotated is None:
                    annotated = draw_detections(frame, persons + objects)
                evidence_path = save_evidence(annotated, video_label, frame_idx, "head_turn")
                alert = {
                    "type": "SUSPICIOUS_HEAD_TURN",
                    "severity": "medium",
                    "title": f"Head turned {head_direction} for {head_duration:.1f}s",
                    "description": f"Student (tracker #{pid}) suspicious head turn at {video_time:.1f}s",
                    "metadata": {"tracker_id": pid, "yaw": yaw_val, "video_time": video_time, "evidence_path": evidence_path},
                }
                alerts.append(alert)
                state.alert_count["head_turn"] += 1

            down_count = state.count("looking_down")
            down_duration = down_count * SAMPLE_EVERY / fps_rate
            if down_duration >= LOOKING_DOWN_THRESHOLD and state.check_cooldown("looking_down", now):
                if annotated is None:
                    annotated = draw_detections(frame, persons + objects)
                evidence_path = save_evidence(annotated, video_label, frame_idx, "looking_down")
                alert = {
                    "type": "LOOKING_DOWN_DETECTED",
                    "severity": "low",
                    "title": f"Looking down for {down_duration:.1f}s",
                    "description": f"Student (tracker #{pid}) looking down at {video_time:.1f}s",
                    "metadata": {"tracker_id": pid, "pitch": pitch_val, "video_time": video_time, "evidence_path": evidence_path},
                }
                alerts.append(alert)
                state.alert_count["looking_down"] += 1

            if hands_up and phone_dets and state.check_cooldown("hands_phone", now, COOLDOWN_S):
                if annotated is None:
                    annotated = draw_detections(frame, persons + objects)
                evidence_path = save_evidence(annotated, video_label, frame_idx, "hands_phone")
                alert = {
                    "type": "PHONE_USAGE_DETECTED",
                    "severity": "high",
                    "title": "Hands raised while phone detected",
                    "description": f"Student (tracker #{pid}) hands up + phone at {video_time:.1f}s",
                    "metadata": {"tracker_id": pid, "video_time": video_time, "evidence_path": evidence_path},
                }
                alerts.append(alert)
                state.alert_count["hands_phone"] += 1

            if frame_idx % (SAMPLE_EVERY * 10) == 0:
                events.append({
                    "type": "PERSON_ENTERED",
                    "severity": "info",
                    "description": f"Detected {len(persons)} persons, {len(objects)} objects, {len(poses)} poses",
                    "metadata": {
                        "person_count": len(persons),
                        "object_count": len(objects),
                        "pose_count": len(poses),
                        "frame": frame_idx,
                        "video_time": video_time,
                    },
                })

        # Save annotated frame periodically
        if frame_idx % (SAMPLE_EVERY * 30) == 0 and persons:
            annotated = draw_detections(frame, persons + objects)
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            fname = f"{ts}_{video_label}_f{frame_idx:06d}.jpg"
            cv2.imwrite(str(STORAGE_FRAMES / fname), annotated)

        frame_idx += 1

    if pbar:
        pbar.close()

    elapsed = time.time() - t_start
    actual_frames = frame_idx // SAMPLE_EVERY
    avg_fps = actual_frames / elapsed if elapsed > 0 else 0

    cap.release()

    # Per-person breakdown
    person_breakdown = {}
    for pid, state in student_states.items():
        person_breakdown[pid] = dict(state.alert_count)

    stats = {
        "total_frames": total_frames,
        "analyzed_frames": actual_frames,
        "processing_time_s": round(elapsed, 1),
        "avg_fps": round(avg_fps, 1),
        "persons_tracked": len(student_states),
        "alerts_generated": len(alerts),
        "events_generated": len(events),
        "alert_type_counts": dict(sum((s.alert_count.values() for s in student_states.values()), defaultdict(int))) if student_states else {},
        "per_person_breakdown": person_breakdown,
    }
    logger.info("  Done: %d alerts, %d events, %.1f FPS", len(alerts), len(events), avg_fps)
    return {"events": events, "alerts": alerts, "stats": stats}


async def seed_database(all_results, client):
    token_data = None
    try:
        resp = await client.post(f"{BACKEND_URL}/api/v1/auth/login", json={
            "email": "admin@classguard.dev",
            "password": "Admin@12345",
        })
        token_data = resp.json()
    except Exception as e:
        logger.error("Login failed: %s", e)
        return

    headers = {"Authorization": f"Bearer {token_data['access_token']}"}

    resp = await client.get(f"{BACKEND_URL}/api/v1/classrooms", headers=headers)
    classrooms = resp.json()
    if not classrooms:
        logger.error("No classrooms found. Run seed_data.py first.")
        return
    classroom_id = classrooms[0]["id"]
    classroom_name = classrooms[0]["name"]

    resp = await client.get(f"{BACKEND_URL}/api/v1/cameras", headers=headers)
    cameras = resp.json()
    if not cameras:
        logger.error("No cameras found. Run seed_data.py first.")
        return
    camera_id = cameras[0]["id"]
    camera_name = cameras[0]["name"]

    logger.info("Using classroom=%s (%s), camera=%s (%s)", classroom_name, classroom_id, camera_name, camera_id)

    base_time = datetime.now(timezone.utc) - timedelta(hours=2)
    total_events = 0
    total_alerts = 0

    for video_label, results in all_results.items():
        video_events = results["events"]
        video_alerts = results["alerts"]

        for i, evt in enumerate(video_events):
            event_time = base_time + timedelta(seconds=i * 30)
            try:
                await client.post(f"{BACKEND_URL}/api/v1/events", headers=headers, json={
                    "eventType": evt["type"],
                    "severity": evt["severity"],
                    "message": evt["description"],
                    "classroomId": classroom_id,
                    "cameraId": camera_id,
                    "metadata": json.dumps(evt.get("metadata", {})),
                })
                total_events += 1
            except Exception as e:
                logger.warning("Failed to create event: %s", e)

        for i, alert in enumerate(video_alerts):
            alert_time = base_time + timedelta(seconds=i * 15)
            severity_map = {"high": "high", "medium": "medium", "low": "low"}
            sev = severity_map.get(alert["severity"], "info")
            try:
                await client.post(f"{BACKEND_URL}/api/v1/alerts", headers=headers, json={
                    "title": alert["title"],
                    "description": alert["description"],
                    "severity": sev,
                    "status": "active",
                    "classroomId": classroom_id,
                    "cameraId": camera_id,
                    "type": alert["type"],
                })
                total_alerts += 1
            except Exception as e:
                logger.warning("Failed to create alert: %s", e)

        await asyncio.sleep(0.1)

    logger.info("Seeded %d events and %d alerts into the database.", total_events, total_alerts)


async def main():
    logger.info("Loading models...")
    detector = YOLO(str(MODELS_DIR / "yolov8m.pt"))
    pose_model = YOLO(str(MODELS_DIR / "yolov8m-pose.pt"))
    logger.info("Models loaded on GPU.")

    # Load config for tracker / gaze / fp_filter
    config_path = Path(__file__).resolve().parent / "config.yaml"
    config = {}
    if config_path.exists():
        import yaml
        with open(config_path) as f:
            config = yaml.safe_load(f) or {}

    tracker = ByteTracker(config)
    gaze_estimator = GazeEstimator(config)
    fp_filter = FalsePositiveFilter(config)

    all_results = {}
    for video_info in TEST_VIDEOS:
        path = video_info["path"]
        label = video_info["label"]
        if not path.exists():
            logger.warning("Skipping missing video: %s", path)
            continue
        logger.info("Analyzing: %s", path.name)
        results = analyze_video(path, detector, pose_model, tracker, gaze_estimator, fp_filter)
        all_results[label] = results

        # Reset tracker between videos
        tracker = ByteTracker(config)

    logger.info("All videos analyzed. Seeding database...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        await seed_database(all_results, client)

    report_path = PROJECT_ROOT / "ai" / "analysis_results.json"
    serializable = {}
    for k, v in all_results.items():
        serializable[k] = {
            "stats": v["stats"],
            "alerts_count": len(v["alerts"]),
            "events_count": len(v["events"]),
            "alerts_sample": v["alerts"][:5],
            "events_sample": v["events"][:3],
        }
    with open(report_path, "w") as f:
        json.dump(serializable, f, indent=2, default=str)
    logger.info("Report saved to %s", report_path)

    # Summary statistics
    total_alerts_all = sum(len(r["alerts"]) for r in all_results.values())
    total_events_all = sum(len(r["events"]) for r in all_results.values())
    total_persons = sum(r["stats"].get("persons_tracked", 0) for r in all_results.values())

    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)
    for label, results in all_results.items():
        s = results["stats"]
        print(f"\n  {label}:")
        print(f"    Frames analyzed: {s['analyzed_frames']}/{s['total_frames']}")
        print(f"    Processing time: {s['processing_time_s']}s")
        print(f"    GPU FPS: {s['avg_fps']}")
        print(f"    Persons tracked: {s['persons_tracked']}")
        print(f"    Alerts generated: {s['alerts_generated']}")
        print(f"    Events generated: {s['events_generated']}")
        if s.get("per_person_breakdown"):
            print(f"    Per-person alerts:")
            for pid, counts in s["per_person_breakdown"].items():
                if counts:
                    print(f"      Student #{pid}: {dict(counts)}")
    print(f"\n  TOTALS:")
    print(f"    Videos processed: {len(all_results)}")
    print(f"    Total persons tracked: {total_persons}")
    print(f"    Total alerts: {total_alerts_all}")
    print(f"    Total events: {total_events_all}")
    print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
