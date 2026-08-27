import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional

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

        # Console output
        severity_colors = {"HIGH": "\033[91m", "MEDIUM": "\033[93m", "LOW": "\033[94m"}
        color = severity_colors.get(alert["severity"], "\033[0m")
        reset = "\033[0m"
        logger.warning(
            "%s[ALERT-%s] Student #%d | Cam %d | %s | %s%s",
            color, alert["severity"], alert["track_id"], alert["camera_id"],
            alert["alert_type"], alert["message"], reset,
        )

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
