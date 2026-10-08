import argparse
import asyncio
import sys
import logging
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ultralytics import YOLO
import httpx

from src.tracker import ByteTracker
from src.gaze_estimator import GazeEstimator
from src.false_positive_filter import FalsePositiveFilter
from analyze_videos import analyze_video, seed_database, load_config

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("process_single_video")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "ai" / "models"

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("video_path")
    parser.add_argument("camera_id")
    args = parser.parse_args()

    video_path = Path(args.video_path)
    if not video_path.exists():
        logger.error(f"Video path does not exist: {video_path}")
        return

    logger.info("Loading config...")
    import yaml
    with open("config.yaml") as f:
        config = yaml.safe_load(f)

    logger.info("Loading models...")
    model_candidates = [
        MODELS_DIR / "yolo26m_custom.pt",
        MODELS_DIR / "yolo26m.pt",
        MODELS_DIR / "yolov8m.pt",
    ]
    det_path = next((p for p in model_candidates if p.exists()), "yolo26m.pt")
    detector = YOLO(str(det_path))
    pose_model = YOLO(str(MODELS_DIR / "yolov8m-pose.pt"))

    tracker = ByteTracker(config)
    gaze_estimator = GazeEstimator(config)
    fp_filter = FalsePositiveFilter(config)

    logger.info(f"Analyzing: {video_path.name}")
    results = analyze_video(video_path, detector, pose_model, tracker, gaze_estimator, fp_filter)
    
    # Seed database correctly using the provided camera_id
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Login
        BACKEND_URL = "http://backend:8000" # Internal docker network url for backend
        try:
            resp = await client.post(f"{BACKEND_URL}/api/v1/auth/login", json={
                "email": "admin@classguard.dev",
                "password": "Admin@12345",
            })
            if resp.status_code != 200:
                logger.error("Login failed")
                return
            token_data = resp.json()
        except Exception as e:
            logger.error(f"Login failed: {e}")
            return

        headers = {"Authorization": f"Bearer {token_data['access_token']}"}

        # Fetch camera details to get classroom_id
        resp = await client.get(f"{BACKEND_URL}/api/v1/cameras/{args.camera_id}", headers=headers)
        if resp.status_code != 200:
            logger.error(f"Camera not found: {args.camera_id}")
            return
        camera = resp.json()
        classroom_id = camera["classroom_id"]

        from datetime import datetime, timezone, timedelta
        import json
        
        base_time = datetime.now(timezone.utc)
        
        video_events = results["events"]
        video_alerts = results["alerts"]

        for i, evt in enumerate(video_events):
            try:
                await client.post(f"{BACKEND_URL}/api/v1/events", headers=headers, json={
                    "eventType": evt["type"],
                    "severity": evt["severity"],
                    "message": evt["description"],
                    "classroomId": classroom_id,
                    "cameraId": args.camera_id,
                    "metadata": json.dumps(evt.get("metadata", {})),
                })
            except Exception as e:
                logger.warning(f"Failed to create event: {e}")

        for i, alert in enumerate(video_alerts):
            severity_map = {"high": "high", "medium": "medium", "low": "low"}
            sev = severity_map.get(alert["severity"], "info")
            try:
                await client.post(f"{BACKEND_URL}/api/v1/alerts", headers=headers, json={
                    "title": alert["title"],
                    "description": alert["description"],
                    "severity": sev,
                    "status": "active",
                    "classroomId": classroom_id,
                    "cameraId": args.camera_id,
                    "type": alert["type"],
                })
            except Exception as e:
                logger.warning(f"Failed to create alert: {e}")
        
        logger.info(f"Processed {len(video_alerts)} alerts and {len(video_events)} events.")
        
if __name__ == "__main__":
    asyncio.run(main())
