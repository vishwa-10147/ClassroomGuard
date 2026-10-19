import logging
import time
from typing import Callable, Optional

from .tracker import Track

logger = logging.getLogger(__name__)


class CheatingEngine:
    def __init__(self, config: dict, clock: Optional[Callable[[], float]] = None):
        # Recorded footage passes the video position, so durations are measured in video time
        self._clock = clock or (lambda: time.time())
        self.rules = config.get("cheating_rules", {})
        self.cooldown = float(config.get("alerts", {}).get("cooldown", 10.0))
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
                "objects": {},
                "head_turn_since": None,
                "looking_down_since": None,
                "last_alert_times": {},
                "seat_center": None,
            }

        state = self._student_state[track_id]
        alerts = []
        now = self._clock()
        phone_dets = [d for d in object_detections if d["class_name"] in ("cell_phone", "cell phone")]
        proximity = self.rules.get("phone_usage", {}).get("proximity_to_person", 150)
        near_phones = [d for d in phone_dets if self._is_near_person(track.bbox, d["bbox"], proximity)]

        # --- Prohibited objects: phone always, calculator unless this exam allows it ---
        for rule_name, class_name, alert_type in (
            ("phone_usage", "cell_phone", "phone_usage"),
            ("calculator_usage", "calculator", "calculator_usage"),
        ):
            rule = self.rules.get(rule_name, {})
            if not rule.get("enabled", True) or rule.get("allowed", False):
                continue
            alert = self._object_rule(
                state, track, pose_analysis, object_detections, camera_id, now,
                rule, class_name, alert_type,
            )
            if alert:
                alerts.append(alert)

        # --- Posture / Head direction ---
        if pose_analysis and self.rules.get("posture", {}).get("enabled", True):
            head = pose_analysis.get("head", {})
            posture = pose_analysis.get("posture", {})

            # Head turned left/right or turned back
            direction = head.get("direction", "unknown")
            if direction in ("left", "right", "turned_back"):
                if state["head_turn_since"] is None:
                    state["head_turn_since"] = now
                duration = now - state["head_turn_since"]
                threshold = self.rules["posture"].get("head_turn_duration", 2.0)
                if duration >= threshold:
                    severity = "HIGH" if direction == "turned_back" else "MEDIUM"
                    msg = f"Student turned BACKWARD for {duration:.1f}s" if direction == "turned_back" else f"Head turned {direction} for {duration:.1f}s"
                    alert_type = "student_turning_back" if direction == "turned_back" else "suspicious_head_turn"
                    alert = self._make_alert(
                        track_id, alert_type, severity,
                        msg, camera_id, {"yaw": head.get("yaw", 0)},
                    )
                    if alert:
                        alerts.append(alert)
            else:
                state["head_turn_since"] = None

            # Looking down too long
            if direction == "down":
                if state["looking_down_since"] is None:
                    state["looking_down_since"] = now
                duration = now - state["looking_down_since"]
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
                state["looking_down_since"] = None

            # Hands above shoulder (possible phone in lap)
            hands = pose_analysis.get("hands", {})
            if hands.get("hands_up", False) and near_phones:
                alert = self._make_alert(
                    track_id, "hands_up_with_phone", "HIGH",
                    "Hands raised while phone detected",
                    camera_id, {},
                )
                if alert:
                    alerts.append(alert)

        return alerts

    def _object_rule(
        self, state: dict, track: Track, pose_analysis: Optional[dict], object_detections: list[dict],
        camera_id: int, now: float, rule: dict, class_name: str, alert_type: str,
    ) -> Optional[dict]:
        """Alert when a prohibited object stays with this student for `alert_after_seconds`."""
        proximity = rule.get("proximity_to_person", 150)
        dets = [
            d for d in object_detections
            if self._normalize(d["class_name"]) == class_name
            and self._is_near_person(track.bbox, d["bbox"], proximity)
        ]
        obj_state = state["objects"].setdefault(class_name, {"since": None, "last_seen": None})
        if not dets:
            # Short gaps (occlusion, missed frame) do not reset the timer
            if obj_state["last_seen"] is not None and now - obj_state["last_seen"] > rule.get("grace_seconds", 1.0):
                obj_state["since"] = obj_state["last_seen"] = None
            return None

        if obj_state["since"] is None:
            obj_state["since"] = now
        obj_state["last_seen"] = now
        duration = now - obj_state["since"]
        if duration < rule.get("alert_after_seconds", 1.0):
            return None

        best = max(dets, key=lambda d: d["confidence"])
        in_hand = self._in_hand(best["bbox"], pose_analysis, rule.get("hand_radius_scale", 0.6))
        label = class_name.replace("_", " ")
        where = "in hand" if in_hand else "at desk"
        return self._make_alert(
            track.track_id, alert_type, "HIGH" if in_hand else "MEDIUM",
            f"{label.capitalize()} {where} for {duration:.1f}s", camera_id,
            {"object_bbox": best["bbox"], "confidence": best["confidence"], "in_hand": in_hand},
        )

    @staticmethod
    def _normalize(name: str) -> str:
        return "cell_phone" if name in ("cell phone", "cell-phones", "cell_phones") else name

    @staticmethod
    def _in_hand(obj_bbox: list, pose_analysis: Optional[dict], radius_scale: float) -> bool:
        """Object centre within ~a hand's reach of a visible wrist (radius scales with shoulder width)."""
        if not pose_analysis or "keypoints" not in pose_analysis:
            return False
        kpts = pose_analysis["keypoints"]
        kconf = pose_analysis.get("keypoint_conf") or [1.0] * len(kpts)
        if len(kpts) < 11:
            return False
        cx, cy = (obj_bbox[0] + obj_bbox[2]) / 2, (obj_bbox[1] + obj_bbox[3]) / 2
        shoulders = [kpts[i] for i in (5, 6) if kconf[i] > 0.3]
        shoulder_w = abs(shoulders[0][0] - shoulders[1][0]) if len(shoulders) == 2 else 0
        radius = max(40.0, radius_scale * shoulder_w)
        for i in (9, 10):  # left / right wrist
            if kconf[i] > 0.3:
                wx, wy = kpts[i]
                if ((wx - cx) ** 2 + (wy - cy) ** 2) ** 0.5 <= radius:
                    return True
        return False

    @staticmethod
    def assign_objects(tracks: list[Track], pose_by_track: dict, objects: list[dict]) -> dict[int, list[dict]]:
        """Give each object to the single nearest student (wrist if visible, else box centre).

        Students share benches, so without this one phone would be blamed on every neighbour.
        """
        assigned: dict[int, list[dict]] = {t.track_id: [] for t in tracks}
        for obj in objects:
            ox, oy = (obj["bbox"][0] + obj["bbox"][2]) / 2, (obj["bbox"][1] + obj["bbox"][3]) / 2
            best_id, best_d = None, float("inf")
            for t in tracks:
                points = []
                pose = pose_by_track.get(t.track_id)
                if pose and "keypoints" in pose:
                    kconf = pose.get("keypoint_conf") or [1.0] * len(pose["keypoints"])
                    points = [pose["keypoints"][i] for i in (9, 10) if len(pose["keypoints"]) > 10 and kconf[i] > 0.3]
                if not points:
                    x0, y0, x1, y1 = t.bbox
                    points = [((x0 + x1) / 2, (y0 + y1) / 2)]
                d = min(((px - ox) ** 2 + (py - oy) ** 2) ** 0.5 for px, py in points)
                if d < best_d:
                    best_id, best_d = t.track_id, d
            if best_id is not None:
                assigned[best_id].append(obj)
        return assigned

    def _make_alert(
        self, track_id: int, alert_type: str, severity: str,
        message: str, camera_id: int, extra: dict,
    ) -> Optional[dict]:
        state = self._student_state[track_id]
        last = state["last_alert_times"].get(alert_type)
        now = self._clock()
        if last is not None and now - last < self.cooldown:
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

    def _is_near_person(self, person_bbox: list, object_bbox: list, threshold: int) -> bool:
        px1, py1, px2, py2 = person_bbox
        ox1, oy1, ox2, oy2 = object_bbox
        
        # Expand the person bounding box by the threshold
        # If the object bounding box overlaps with this expanded box, they are "near"
        return (ox1 < px2 + threshold and ox2 > px1 - threshold and
                oy1 < py2 + threshold and oy2 > py1 - threshold)
