import logging
import time
from typing import Optional

from .tracker import Track

logger = logging.getLogger(__name__)


class CheatingEngine:
    def __init__(self, config: dict):
        self.rules = config.get("cheating_rules", {})
        self._student_state: dict[int, dict] = {}

    def evaluate(
        self,
        track: Track,
        pose_analysis: Optional[dict],
        object_detections: list[dict],
        camera_id: int,
    ) -> list[dict]:
        """Evaluate a tracked student for cheating indicators."""
        track_id = track.track_id
        if track_id not in self._student_state:
            self._student_state[track_id] = {
                "phone_frames": 0,
                "calculator_frames": 0,
                "head_turn_frames": 0,
                "looking_down_frames": 0,
                "last_alert_times": {},
                "seat_center": None,
            }

        state = self._student_state[track_id]
        alerts = []

        # --- Phone detection ---
        if self.rules.get("phone_usage", {}).get("enabled", True):
            phone_dets = [d for d in object_detections if d["class_name"] == "cell_phone"]
            if phone_dets:
                phone_bbox = phone_dets[0]["bbox"]
                if self._is_near_person(track.bbox, phone_bbox, self.rules["phone_usage"].get("proximity_to_person", 150)):
                    state["phone_frames"] += 1
                    threshold = self.rules["phone_usage"].get("alert_after_frames", 5)
                    if state["phone_frames"] >= threshold:
                        alert = self._make_alert(
                            track_id, "phone_usage", "HIGH",
                            f"Phone detected near student for {state['phone_frames']} frames",
                            camera_id, {"phone_bbox": phone_bbox},
                        )
                        if alert:
                            alerts.append(alert)
                else:
                    state["phone_frames"] = max(0, state["phone_frames"] - 1)

        # --- Calculator detection ---
        if self.rules.get("calculator_usage", {}).get("enabled", True):
            calc_dets = [d for d in object_detections if d["class_name"] == "calculator"]
            if calc_dets:
                allowed = self.rules["calculator_usage"].get("allowed_sections", [])
                if track_id not in allowed:
                    state["calculator_frames"] += 1
                    threshold = self.rules["calculator_usage"].get("alert_after_frames", 3)
                    if state["calculator_frames"] >= threshold:
                        alert = self._make_alert(
                            track_id, "calculator_usage", "MEDIUM",
                            f"Calculator detected (not in allowed section)",
                            camera_id, {"calculator_bbox": calc_dets[0]["bbox"]},
                        )
                        if alert:
                            alerts.append(alert)
            else:
                state["calculator_frames"] = max(0, state["calculator_frames"] - 1)

        # --- Posture / Head direction ---
        if pose_analysis and self.rules.get("posture", {}).get("enabled", True):
            head = pose_analysis.get("head", {})
            posture = pose_analysis.get("posture", {})

            # Head turned too long
            direction = head.get("direction", "unknown")
            if direction in ("left", "right"):
                state["head_turn_frames"] += 1
                duration = state["head_turn_frames"] / 30.0  # assume ~30fps
                threshold = self.rules["posture"].get("head_turn_duration", 3.0)
                if duration >= threshold:
                    alert = self._make_alert(
                        track_id, "suspicious_head_turn", "MEDIUM",
                        f"Head turned {direction} for {duration:.1f}s",
                        camera_id, {"yaw": head.get("yaw", 0)},
                    )
                    if alert:
                        alerts.append(alert)
            else:
                state["head_turn_frames"] = max(0, state["head_turn_frames"] - 1)

            # Looking down too long
            if direction == "down":
                state["looking_down_frames"] += 1
                duration = state["looking_down_frames"] / 30.0
                threshold = self.rules["posture"].get("looking_down_duration", 2.0)
                if duration >= threshold:
                    alert = self._make_alert(
                        track_id, "looking_down", "LOW",
                        f"Looking down for {duration:.1f}s (possible hidden materials)",
                        camera_id, {"pitch": head.get("pitch", 0)},
                    )
                    if alert:
                        alerts.append(alert)
            else:
                state["looking_down_frames"] = max(0, state["looking_down_frames"] - 1)

            # Hands above shoulder (possible phone in lap)
            hands = pose_analysis.get("hands", {})
            if hands.get("hands_up", False) and phone_dets:
                alert = self._make_alert(
                    track_id, "hands_up_with_phone", "HIGH",
                    "Hands raised while phone detected",
                    camera_id, {},
                )
                if alert:
                    alerts.append(alert)

        return alerts

    def _make_alert(
        self, track_id: int, alert_type: str, severity: str,
        message: str, camera_id: int, extra: dict,
    ) -> Optional[dict]:
        state = self._student_state[track_id]
        cooldown = 10.0
        last = state["last_alert_times"].get(alert_type, 0)
        now = time.time()
        if now - last < cooldown:
            return None

        state["last_alert_times"][alert_type] = now
        return {
            "track_id": track_id,
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "camera_id": camera_id,
            "timestamp": now,
            **extra,
        }

    def reset_student(self, track_id: int):
        self._student_state.pop(track_id, None)

    def get_student_state(self, track_id: int) -> dict:
        return self._student_state.get(track_id, {})
