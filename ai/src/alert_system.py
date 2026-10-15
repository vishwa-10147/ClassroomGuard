import json
import logging
import os
import queue
import socket
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional
import requests

import cv2
import numpy as np

logger = logging.getLogger(__name__)


class AlertSystem:
    def __init__(self, config: dict):
        alert_cfg = config.get("alerts", {})
        self.enabled = alert_cfg.get("enabled", True)
        self.log_to_file = alert_cfg.get("log_to_file", True)
        self.log_dir = Path(alert_cfg.get("log_dir", "logs"))
        self.save_snapshots = alert_cfg.get("save_snapshots", True)
        self.snapshot_dir = Path(alert_cfg.get("snapshot_dir", "logs/snapshots"))
        backend_base = os.environ.get("BACKEND_URL", "http://backend:8000").rstrip("/")
        self.backend_url = f"{backend_base}/api/v1/events"
        self.heartbeat_url = f"{backend_base}/api/v1/ai/heartbeat"
        self.service_token = os.environ.get("AI_SERVICE_TOKEN", "")
        if not self.service_token:
            logger.warning("AI_SERVICE_TOKEN not set - alerts will not be pushed to the backend")

        # AI camera index -> the Camera ID entered for that camera in the web app (Cameras page).
        # The API derives the classroom from the camera.
        self._backend_ids: dict[int, tuple[str, str | None]] = {}
        for cam in config.get("cameras", []):
            backend_id = cam.get("backend_camera_id")
            if not backend_id:
                backend_id = f"cam-{cam['id'] + 1:03d}"
                logger.warning(
                    "Camera %s has no backend_camera_id in the config - sending '%s'", cam["id"], backend_id
                )
            self._backend_ids[cam["id"]] = (backend_id, cam.get("backend_classroom_id"))

        # Push off the inference loop so a slow/down backend never stalls detection
        self._push_queue: queue.Queue = queue.Queue(maxsize=500)
        if self.service_token:
            threading.Thread(target=self._push_worker, daemon=True).start()



        # Storage directories
        self.evidence_dir = Path("storage/evidence")
        self.frames_dir = Path("storage/frames")

        if self.log_to_file:
            self.log_dir.mkdir(parents=True, exist_ok=True)
            self._log_file = self.log_dir / f"alerts_{datetime.now().strftime('%Y%m%d')}.jsonl"
        if self.save_snapshots:
            self.snapshot_dir.mkdir(parents=True, exist_ok=True)

        self.evidence_dir.mkdir(parents=True, exist_ok=True)
        self.frames_dir.mkdir(parents=True, exist_ok=True)

        self._event_log: list[dict] = []
        self._callbacks: list = []

    def register_callback(self, callback):
        self._callbacks.append(callback)

    def process_alert(
        self, alert: dict, frame: Optional[np.ndarray] = None,
        annotated_frame: Optional[np.ndarray] = None,
    ):
        if not self.enabled:
            return

        alert["timestamp_str"] = datetime.fromtimestamp(alert["timestamp"]).isoformat()
        self._event_log.append(alert)

        # Log to file
        if self.log_to_file:
            self._write_log(alert)

        # Save snapshot (raw frame)
        if self.save_snapshots and frame is not None:
            self._save_snapshot(alert, frame)

        # Save annotated frame (with bounding boxes) to storage/evidence/
        if annotated_frame is not None:
            self._save_evidence(alert, annotated_frame)

        # Notify callbacks (dashboard, email, etc.)
        for cb in self._callbacks:
            try:
                cb(alert)
            except Exception as e:
                logger.error("Alert callback error: %s", e)

        # Push to backend REST API
        self._push_to_backend(alert)

        # Console output
        severity_colors = {"HIGH": "\033[91m", "MEDIUM": "\033[93m", "LOW": "\033[94m"}
        color = severity_colors.get(alert["severity"], "\033[0m")
        reset = "\033[0m"
        logger.warning(
            "%s[ALERT-%s] Student #%d | Cam %d | %s | %s%s",
            color, alert["severity"], alert["track_id"], alert["camera_id"],
            alert["alert_type"], alert["message"], reset,
        )

    def _push_to_backend(self, alert: dict):
        if not self.service_token:
            return
        cid = alert.get("camera_id", 0)
        camera_id, classroom_id = self._backend_ids.get(cid, (f"cam-{cid + 1:03d}", None))
        payload = {
            "eventType": str(alert.get("alert_type")).upper().replace(" ", "_"),
            "severity": str(alert.get("severity", "MEDIUM")).lower(),
            "cameraId": camera_id,
            "trackerId": alert.get("track_id"),
            "confidence": alert.get("confidence", 0.9),
            "metadata": {"message": alert.get("message"), "evidence_path": alert.get("evidence_path")},
        }
        if classroom_id:
            payload["classroomId"] = classroom_id
        try:
            self._push_queue.put_nowait((self.backend_url, payload))
        except queue.Full:
            logger.error("Backend push queue full - dropping alert %s", payload["eventType"])

    def send_heartbeat(self, camera_states: dict[int, tuple[bool, float]]) -> None:
        """Tell the API this engine is alive and which cameras deliver video.

        camera_states: AI camera index -> (receiving frames, fps). Shown as AI Online/Offline and
        as each camera's online/offline status in the web app.
        """
        if not self.service_token:
            return
        cameras = [
            {"id": self._backend_ids.get(cid, (f"cam-{cid + 1:03d}", None))[0], "online": online, "fps": round(fps, 1)}
            for cid, (online, fps) in camera_states.items()
        ]
        online = [c for c in cameras if c["online"]]
        payload = {
            "engine": socket.gethostname(),
            "cameras": len(online),
            "fps": round(sum(c["fps"] for c in online) / max(len(online), 1), 1),
            "camera_status": cameras,
        }
        try:
            self._push_queue.put_nowait((self.heartbeat_url, payload))
        except queue.Full:
            pass

    def _push_worker(self):
        headers = {"X-Service-Token": self.service_token}
        while True:
            url, payload = self._push_queue.get()
            try:
                resp = requests.post(url, json=payload, headers=headers, timeout=5)
                if resp.status_code not in (200, 201, 204):
                    logger.error("Backend rejected %s: %s %s", url.rsplit("/", 1)[-1], resp.status_code, resp.text)
            except Exception as e:
                logger.error("Exception pushing to backend: %s", e)

    def _write_log(self, alert: dict):
        try:
            with open(self._log_file, "a") as f:
                f.write(json.dumps(alert, default=str) + "\n")
        except Exception as e:
            logger.error("Failed to write alert log: %s", e)

    def _save_snapshot(self, alert: dict, frame: np.ndarray):
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{ts}_cam{alert['camera_id']}_student{alert['track_id']}_{alert['alert_type']}.jpg"
            filepath = self.snapshot_dir / filename
            cv2.imwrite(str(filepath), frame)
        except Exception as e:
            logger.error("Failed to save snapshot: %s", e)

    def _save_evidence(self, alert: dict, annotated_frame: np.ndarray):
        """Save annotated frame (with bounding boxes drawn) to storage/evidence/."""
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{ts}_cam{alert['camera_id']}_student{alert['track_id']}_{alert['alert_type']}_evidence.jpg"
            filepath = self.evidence_dir / filename
            cv2.imwrite(str(filepath), annotated_frame)
            alert["evidence_path"] = str(filepath)
            logger.info("Evidence saved: %s", filepath)
        except Exception as e:
            logger.error("Failed to save evidence: %s", e)

    def save_annotated_frame(self, frame: np.ndarray, cam_id: int, detections: list[dict] = None, frame_num: int = 0):
        """Save an annotated frame (with detections drawn) periodically to storage/frames/."""
        try:
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{ts}_cam{cam_id}_frame{frame_num:06d}.jpg"
            filepath = self.frames_dir / filename
            cv2.imwrite(str(filepath), frame)
        except Exception as e:
            logger.error("Failed to save annotated frame: %s", e)

    def get_recent_alerts(self, n: int = 50) -> list[dict]:
        return self._event_log[-n:]

    def get_alert_counts(self) -> dict:
        counts = {}
        for a in self._event_log:
            key = a["alert_type"]
            counts[key] = counts.get(key, 0) + 1
        return counts

    def get_summary(self) -> dict:
        return {
            "total_alerts": len(self._event_log),
            "alert_counts": self.get_alert_counts(),
            "high_severity": sum(1 for a in self._event_log if a["severity"] == "HIGH"),
            "medium_severity": sum(1 for a in self._event_log if a["severity"] == "MEDIUM"),
            "low_severity": sum(1 for a in self._event_log if a["severity"] == "LOW"),
        }
