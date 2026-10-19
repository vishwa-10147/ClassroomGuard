"""One frame through detection, tracking and the cheating rules.

Shared by live cameras (main.py) and the analysis of uploaded recordings
(recording_worker.py) so both raise exactly the same alerts for the same footage.
"""

from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np

from .cheating_logic import CheatingEngine
from .false_positive_filter import FalsePositiveFilter
from .tracker import ByteTracker, Track
from .zones import ZoneMap


@dataclass
class CameraState:
    """Everything that must not be shared between cameras (or between two recordings)."""
    tracker: ByteTracker
    fp_filter: FalsePositiveFilter
    engine: CheatingEngine
    zones: ZoneMap = field(default_factory=ZoneMap)


@dataclass
class FrameResult:
    detections: list[dict]
    pose_analyses: list[dict]
    tracked: list[Track]
    # Alerts that passed the debouncer, each with its annotated evidence frame
    alerts: list[tuple[dict, Optional[np.ndarray]]]


class FrameAnalyzer:
    def __init__(self, config: dict, detector, pose_analyzer, gaze_estimator):
        self.config = config
        self.detector = detector
        self.pose_analyzer = pose_analyzer
        self.gaze_estimator = gaze_estimator

    def new_state(self, clock: Optional[Callable[[], float]] = None, zones: Optional[ZoneMap] = None) -> CameraState:
        return CameraState(
            tracker=ByteTracker(self.config, clock=clock),
            fp_filter=FalsePositiveFilter(self.config, clock=clock),
            engine=CheatingEngine(self.config, clock=clock),
            zones=zones or ZoneMap(),
        )

    def analyze(self, state: CameraState, frame: np.ndarray, cam_id: int) -> FrameResult:
        height, width = frame.shape[:2]
        tracker, fp_filter, engine, zones = state.tracker, state.fp_filter, state.engine, state.zones

        # 1. Detect prohibited objects (with false-positive filtering). Objects inside an
        #    ignore zone (the invigilator's desk) never count.
        raw_detections = self.detector.detect(frame)
        detections = fp_filter.filter_detections(raw_detections)
        objects = [
            d for d in detections
            if d["class_name"] != "person"
            and not zones.is_ignored(d["bbox"], width, height)
            and fp_filter.verify_object_detection(d)
        ]

        # 2. People come from the pose model (boxes + wrists), then ByteTrack. People standing
        #    in an ignore zone (invigilators, aisles) are not tracked as students.
        pose_analyses = [
            p for p in self.pose_analyzer.full_analysis(frame)
            if not zones.is_ignored(p["bbox"], width, height)
        ]
        persons = [
            {"bbox": p["bbox"], "confidence": p["box_conf"], "class_name": "person"}
            for p in pose_analyses
        ]
        tracked = tracker.update(persons)

        # 3. Match poses to tracks and give each object to its nearest student
        pose_by_track = {t.track_id: match_pose_to_track(t, pose_analyses) for t in tracked}
        objects_by_track = CheatingEngine.assign_objects(tracked, pose_by_track, objects)

        # 4. Head pose + rules per student
        alerts: list[tuple[dict, Optional[np.ndarray]]] = []
        annotated = None
        for track in tracked:
            best_pose = pose_by_track[track.track_id]
            head_direction = "forward"
            if best_pose and "keypoints" in best_pose:
                head_direction = self.gaze_estimator.estimate_head_pose(best_pose["keypoints"]).direction
            tracker.update_head_direction(track.track_id, head_direction)
            tracker.update_posture(
                track.track_id,
                best_pose.get("posture", {}).get("posture", "unknown") if best_pose else "unknown",
            )

            for alert in engine.evaluate(track, best_pose, objects_by_track[track.track_id], cam_id):
                if not fp_filter.should_alert(track.track_id, alert["alert_type"], alert.get("object_bbox")):
                    continue
                seat = zones.seat_for(track.bbox, alert.get("object_bbox"), width, height)
                if seat:
                    alert["seat_id"] = seat
                alert["person_bbox"] = list(track.bbox)
                if annotated is None:
                    annotated = self.detector.draw_detections(frame, detections)
                    annotated = self.pose_analyzer.draw_pose(annotated, pose_analyses)
                alerts.append((alert, annotated))

        return FrameResult(detections, pose_analyses, tracked, alerts)


def match_pose_to_track(track: Track, pose_analyses: list[dict]) -> dict | None:
    best_iou = 0.0
    best_pose = None
    for pose in pose_analyses:
        iou = _iou(track.bbox, pose["bbox"])
        if iou > best_iou:
            best_iou = iou
            best_pose = pose
    return best_pose if best_iou > 0.3 else None


def _iou(box_a, box_b) -> float:
    x1 = max(box_a[0], box_b[0])
    y1 = max(box_a[1], box_b[1])
    x2 = min(box_a[2], box_b[2])
    y2 = min(box_a[3], box_b[3])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
    area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0
