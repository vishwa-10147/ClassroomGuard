"""False positive reduction pipeline: calibration, verification, deduplication."""

import logging
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class ConfidenceCalibrator:
    """Adjusts detection confidence based on geometric heuristics."""
    min_detection_size: int = 30
    frame_width: int = 1920
    frame_height: int = 1080
    edge_margin: float = 0.05

    def calibrate(self, detection: dict) -> float:
        conf = detection["confidence"]
        bbox = detection["bbox"]
        x1, y1, x2, y2 = bbox
        w = x2 - x1
        h = y2 - y1

        # Penalise very small detections
        if w < self.min_detection_size or h < self.min_detection_size:
            conf *= 0.3

        # Penalise extreme aspect ratios (> 8:1 or < 1:8)
        aspect = max(w, h) / max(min(w, h), 1)
        if aspect > 8:
            conf *= 0.5

        # Penalise detections at frame edges
        cx = (x1 + x2) / 2
        cy = (y1 + y2) / 2
        margin_x = self.frame_width * self.edge_margin
        margin_y = self.frame_height * self.edge_margin
        if cx < margin_x or cx > self.frame_width - margin_x:
            conf *= 0.7
        if cy < margin_y or cy > self.frame_height - margin_y:
            conf *= 0.7

        return conf


@dataclass
class FrameRecord:
    bbox: list[int]
    confidence: float
    class_name: str


class MultiFrameVerifier:
    """Requires N consecutive frames with the same detection before confirming."""

    def __init__(self, min_consecutive_frames: int = 3):
        self.min_consecutive = min_consecutive_frames
        # key = (class_name, spatial_cluster_id) -> deque of frame records
        self._buffers: dict[str, deque[FrameRecord]] = defaultdict(
            lambda: deque(maxlen=min_consecutive_frames + 5)
        )

    def update(self, detection: dict) -> bool:
        cls = detection["class_name"]
        cluster_key = self._spatial_key(detection)
        key = f"{cls}_{cluster_key}"

        rec = FrameRecord(
            bbox=detection["bbox"],
            confidence=detection["confidence"],
            class_name=cls,
        )
        self._buffers[key].append(rec)

        recent = list(self._buffers[key])[-self.min_consecutive:]
        if len(recent) < self.min_consecutive:
            return False

        # Check all recent records have similar bbox positions
        for i in range(1, len(recent)):
            if not self._bboxes_overlap(recent[0].bbox, recent[i].bbox, threshold=0.3):
                return False
        return True

    def reset(self, key: Optional[str] = None):
        if key:
            self._buffers.pop(key, None)
        else:
            self._buffers.clear()

    @staticmethod
    def _spatial_key(detection: dict) -> str:
        bbox = detection["bbox"]
        cx = (bbox[0] + bbox[2]) // 2
        cy = (bbox[1] + bbox[3]) // 2
        # Quantise to 50px grid
        return f"{cx // 50}_{cy // 50}"

    @staticmethod
    def _bboxes_overlap(a: list[int], b: list[int], threshold: float = 0.3) -> bool:
        x1 = max(a[0], b[0])
        y1 = max(a[1], b[1])
        x2 = min(a[2], b[2])
        y2 = min(a[3], b[3])
        inter = max(0, x2 - x1) * max(0, y2 - y1)
        area_a = (a[2] - a[0]) * (a[3] - a[1])
        area_b = (b[2] - b[0]) * (b[3] - b[1])
        union = area_a + area_b - inter
        iou = inter / union if union > 0 else 0
        return iou >= threshold


class DuplicateFilter:
    """NMS-style deduplication within detection clusters."""

    def __init__(self, iou_threshold: float = 0.5):
        self.iou_threshold = iou_threshold

    def filter(self, detections: list[dict]) -> list[dict]:
        if not detections:
            return []

        by_class: dict[str, list[dict]] = defaultdict(list)
        for d in detections:
            by_class[d["class_name"]].append(d)

        result = []
        for cls_dets in by_class.values():
            result.extend(self._nms(cls_dets))
        return result

    def _nms(self, detections: list[dict]) -> list[dict]:
        if not detections:
            return []

        sorted_dets = sorted(detections, key=lambda d: d["confidence"], reverse=True)
        keep = []
        suppressed = set()

        for i, d in enumerate(sorted_dets):
            if i in suppressed:
                continue
            keep.append(d)
            for j in range(i + 1, len(sorted_dets)):
                if j in suppressed:
                    continue
                if self._iou(d["bbox"], sorted_dets[j]["bbox"]) > self.iou_threshold:
                    suppressed.add(j)
        return keep

    @staticmethod
    def _iou(a: list[int], b: list[int]) -> float:
        x1 = max(a[0], b[0])
        y1 = max(a[1], b[1])
        x2 = min(a[2], b[2])
        y2 = min(a[3], b[3])
        inter = max(0, x2 - x1) * max(0, y2 - y1)
        area_a = (a[2] - a[0]) * (a[3] - a[1])
        area_b = (b[2] - b[0]) * (b[3] - b[1])
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0.0


# Cooldown defaults per violation type (seconds)
DEFAULT_COOLDOWNS: dict[str, float] = {
    "phone_usage": 10.0,
    "calculator_usage": 10.0,
    "suspicious_head_turn": 5.0,
    "looking_down": 5.0,
    "hands_up_with_phone": 5.0,
}


@dataclass
class AlertDebouncer:
    """Suppresses repeated alerts for the same person + violation type."""

    cooldowns: dict[str, float] = field(default_factory=lambda: dict(DEFAULT_COOLDOWNS))
    default_cooldown: float = 10.0
    _last_alerts: dict[tuple[int, str], float] = field(default_factory=dict)

    def should_alert(self, track_id: int, alert_type: str, now: Optional[float] = None) -> bool:
        now = now if now is not None else time.time()
        key = (track_id, alert_type)
        last = self._last_alerts.get(key, 0.0)
        cooldown = self.cooldowns.get(alert_type, self.default_cooldown)
        if now - last < cooldown:
            return False
        self._last_alerts[key] = now
        return True

    def reset(self, track_id: Optional[int] = None):
        if track_id is not None:
            self._last_alerts = {k: v for k, v in self._last_alerts.items() if k[0] != track_id}
        else:
            self._last_alerts.clear()


class FalsePositiveFilter:
    """Combined false-positive reduction pipeline.

    Call in order: calibrate -> duplicate_filter -> multi_frame_verify -> debounce.
    """

    def __init__(self, config: dict):
        fp_cfg = config.get("false_positive_filter", {})
        self.calibrator = ConfidenceCalibrator(
            min_detection_size=fp_cfg.get("min_detection_size", 30),
        )
        self.multi_frame = MultiFrameVerifier(
            min_consecutive_frames=fp_cfg.get("min_consecutive_frames", 3),
        )
        self.duplicate_filter = DuplicateFilter()
        self.debouncer = AlertDebouncer()
        self.calibration_enabled = fp_cfg.get("confidence_calibration", True)

    def filter_detections(self, detections: list[dict]) -> list[dict]:
        """Apply calibration and duplicate filtering to raw detections."""
        if self.calibration_enabled:
            for d in detections:
                d["confidence"] = self.calibrator.calibrate(d)
        return self.duplicate_filter.filter(detections)

    def verify_object_detection(self, detection: dict) -> bool:
        """Returns True if the object detection persists across enough frames."""
        return self.multi_frame.update(detection)

    def should_alert(self, track_id: int, alert_type: str) -> bool:
        """Debounce check: returns True only if enough time has elapsed."""
        return self.debouncer.should_alert(track_id, alert_type)

    def reset_track(self, track_id: int):
        self.debouncer.reset(track_id)
