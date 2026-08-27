"""ByteTrack-style multi-stage IoU tracker for persistent student IDs."""

import logging
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


class TrackState(Enum):
    NEW = 0
    TRACKED = 1
    LOST = 2
    REMOVED = 3


@dataclass
class Track:
    track_id: int
    bbox: list[int] = field(default_factory=lambda: [0, 0, 0, 0])
    class_name: str = "person"
    confidence: float = 0.0
    state: TrackState = TrackState.NEW
    age: int = 0
    hits: int = 0
    time_since_update: int = 0
    last_seen: float = 0.0
    centroid_history: deque = field(default_factory=lambda: deque(maxlen=150))
    head_direction_history: deque = field(default_factory=lambda: deque(maxlen=150))
    posture_history: deque = field(default_factory=lambda: deque(maxlen=150))
    alerts: list[dict] = field(default_factory=list)

    @property
    def center(self) -> tuple[int, int]:
        x1, y1, x2, y2 = self.bbox
        return ((x1 + x2) // 2, (y1 + y2) // 2)

    @property
    def width(self) -> int:
        return self.bbox[2] - self.bbox[0]

    @property
    def height(self) -> int:
        return self.bbox[3] - self.bbox[1]

    @property
    def area(self) -> int:
        return self.width * self.height

    def update_state(self):
        if self.state == TrackState.REMOVED:
            return
        if self.time_since_update == 0:
            if self.state in (TrackState.NEW, TrackState.LOST):
                if self.hits >= 3:
                    self.state = TrackState.TRACKED
            elif self.state == TrackState.TRACKED:
                pass
        elif self.time_since_update > 0:
            if self.state == TrackState.NEW:
                if self.time_since_update > 1:
                    self.state = TrackState.REMOVED
            elif self.state == TrackState.TRACKED:
                self.state = TrackState.LOST

    @property
    def is_confirmed(self) -> bool:
        return self.state == TrackState.TRACKED


class ByteTracker:
    """ByteTrack-style multi-stage IoU tracker.

    Matches detections in two stages:
      1. High-confidence detections (>= high_thresh) against existing tracks
      2. Low-confidence detections (track_thresh..high_thresh) against remaining tracks

    Unmatched high-confidence detections create new tracks.
    Lost tracks are kept for max_time_lost frames before removal.
    """

    def __init__(self, config: dict):
        track_cfg = config.get("tracker", config.get("tracking", {}))
        self.track_thresh: float = track_cfg.get("track_thresh", 0.5)
        self.high_thresh: float = track_cfg.get("high_thresh", 0.6)
        self.match_thresh: float = track_cfg.get("match_thresh", 0.8)
        self.max_time_lost: int = track_cfg.get("max_time_lost",
                                                  track_cfg.get("track_buffer", 30))
        self.min_hits: int = track_cfg.get("min_hits", 3)

        self._tracks: dict[int, Track] = {}
        self._lost_pool: list[Track] = []
        self._next_id: int = 1
        self._frame_count: int = 0

    @property
    def tracks(self) -> dict[int, Track]:
        return self._tracks

    def update(self, detections: list[dict]) -> list[Track]:
        self._frame_count += 1
        current_time = time.time()

        # Split detections by confidence
        high_dets = [d for d in detections if d["confidence"] >= self.high_thresh]
        low_dets = [d for d in detections if self.track_thresh <= d["confidence"] < self.high_thresh]

        active_tracks = [t for t in self._tracks.values()
                         if t.state not in (TrackState.REMOVED,)]

        # Stage 1: match high-confidence dets with all active tracks
        matched_high, unmatched_tracks_1, unmatched_high = self._match(active_tracks, high_dets)

        for track_idx, det_idx in matched_high:
            t = active_tracks[track_idx]
            self._update_track(t, high_dets[det_idx], current_time)

        # Stage 2: match low-confidence dets with remaining unmatched tracks
        remaining_tracks = [active_tracks[i] for i in unmatched_tracks_1]
        matched_low, unmatched_tracks_2, unmatched_low = self._match(remaining_tracks, low_dets)

        for track_idx, det_idx in matched_low:
            t = remaining_tracks[track_idx]
            self._update_track(t, low_dets[det_idx], current_time)

        # Increment time_since_update for unmatched active tracks
        all_matched_ids = set()
        for track_idx, _ in matched_high:
            all_matched_ids.add(active_tracks[track_idx].track_id)
        for track_idx, _ in matched_low:
            all_matched_ids.add(remaining_tracks[track_idx].track_id)

        for t in active_tracks:
            if t.track_id not in all_matched_ids:
                t.time_since_update += 1
                t.age += 1
                t.update_state()

        # Create new tracks from unmatched high-confidence detections
        for det_idx in unmatched_high:
            new_track = self._create_track(high_dets[det_idx], current_time)
            self._tracks[new_track.track_id] = new_track

        # Try to recover from lost pool
        all_remaining = [remaining_tracks[i] for i in unmatched_tracks_2]
        self._recover_lost(all_remaining, low_dets, unmatched_low, current_time)

        # Age lost tracks in pool
        for lt in self._lost_pool:
            lt.time_since_update += 1
            lt.update_state()

        # Remove expired lost tracks
        self._lost_pool = [t for t in self._lost_pool
                           if t.time_since_update <= self.max_time_lost]

        # Remove tracks marked REMOVED
        dead_ids = [tid for tid, t in self._tracks.items() if t.state == TrackState.REMOVED]
        for tid in dead_ids:
            del self._tracks[tid]

        # Return confirmed tracks
        return [t for t in self._tracks.values() if t.is_confirmed and t.hits >= self.min_hits]

    def update_head_direction(self, track_id: int, direction: str):
        t = self._tracks.get(track_id)
        if t is not None:
            t.head_direction_history.append(direction)

    def update_posture(self, track_id: int, posture: str):
        t = self._tracks.get(track_id)
        if t is not None:
            t.posture_history.append(posture)

    def get_track(self, track_id: int) -> Optional[Track]:
        return self._tracks.get(track_id)

    def _match(self, tracks: list[Track], detections: list[dict]) -> tuple:
        if not tracks or not detections:
            return [], list(range(len(tracks))), list(range(len(detections)))

        track_boxes = [t.bbox for t in tracks]
        det_boxes = [d["bbox"] for d in detections]
        iou_matrix = self._compute_iou_matrix(track_boxes, det_boxes)

        matched = []
        unmatched_tracks = set(range(len(tracks)))
        unmatched_dets = set(range(len(detections)))

        for _ in range(min(len(tracks), len(detections))):
            if iou_matrix.size == 0:
                break
            idx = np.unravel_index(iou_matrix.argmax(), iou_matrix.shape)
            if iou_matrix[idx] < self.match_thresh:
                break
            matched.append((idx[0], idx[1]))
            unmatched_tracks.discard(idx[0])
            unmatched_dets.discard(idx[1])
            iou_matrix[idx[0], :] = -1
            iou_matrix[:, idx[1]] = -1

        return matched, sorted(unmatched_tracks), sorted(unmatched_dets)

    def _update_track(self, track: Track, detection: dict, current_time: float):
        track.bbox = detection["bbox"]
        track.confidence = detection["confidence"]
        track.class_name = detection.get("class_name", "person")
        track.hits += 1
        track.time_since_update = 0
        track.age += 1
        track.last_seen = current_time
        track.centroid_history.append(track.center)
        track.update_state()

    def _create_track(self, detection: dict, current_time: float) -> Track:
        t = Track(
            track_id=self._next_id,
            bbox=detection["bbox"],
            class_name=detection.get("class_name", "person"),
            confidence=detection["confidence"],
            state=TrackState.NEW,
            hits=1,
            last_seen=current_time,
        )
        t.centroid_history.append(t.center)
        self._next_id += 1
        return t

    def _recover_lost(self, unmatched_tracks: list[Track], low_dets: list[dict],
                      unmatched_low: list[int], current_time: float):
        if not self._lost_pool or not unmatched_low:
            return

        lost_boxes = [t.bbox for t in self._lost_pool]
        det_boxes = [low_dets[i]["bbox"] for i in unmatched_low]
        iou_matrix = self._compute_iou_matrix(lost_boxes, det_boxes)

        used_lost = set()
        used_det = set()

        for _ in range(min(len(self._lost_pool), len(unmatched_low))):
            if iou_matrix.size == 0:
                break
            idx = np.unravel_index(iou_matrix.argmax(), iou_matrix.shape)
            if iou_matrix[idx] < self.match_thresh:
                break
            lost_track = self._lost_pool[idx[0]]
            det = low_dets[unmatched_low[idx[1]]]
            self._update_track(lost_track, det, current_time)
            self._tracks[lost_track.track_id] = lost_track
            used_lost.add(idx[0])
            used_det.add(idx[1])
            iou_matrix[idx[0], :] = -1
            iou_matrix[:, idx[1]] = -1

        self._lost_pool = [t for i, t in enumerate(self._lost_pool) if i not in used_lost]

    @staticmethod
    def _compute_iou_matrix(boxes_a: list, boxes_b: list) -> np.ndarray:
        if not boxes_a or not boxes_b:
            return np.zeros((len(boxes_a), len(boxes_b)), dtype=np.float32)

        a = np.array(boxes_a, dtype=np.float32)
        b = np.array(boxes_b, dtype=np.float32)

        x1 = np.maximum(a[:, 0:1], b[:, 0].T)
        y1 = np.maximum(a[:, 1:2], b[:, 1].T)
        x2 = np.minimum(a[:, 2:3], b[:, 2].T)
        y2 = np.minimum(a[:, 3:4], b[:, 3].T)

        inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
        area_a = (a[:, 2] - a[:, 0]) * (a[:, 3] - a[:, 1])
        area_b = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
        union = area_a[:, None] + area_b[None, :] - inter

        return np.where(union > 0, inter / union, 0.0).astype(np.float32)
