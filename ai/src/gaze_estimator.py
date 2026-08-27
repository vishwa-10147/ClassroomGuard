"""Head pose and gaze estimation from YOLOv8-pose keypoints."""

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np

# MediaPipe / YOLOv8-pose keypoint indices
NOSE = 0
LEFT_EYE = 1
RIGHT_EYE = 2
LEFT_EAR = 3
RIGHT_EAR = 4
LEFT_SHOULDER = 5
RIGHT_SHOULDER = 6
LEFT_ELBOW = 7
RIGHT_ELBOW = 8
LEFT_WRIST = 9
RIGHT_WRIST = 10
LEFT_HIP = 11
RIGHT_HIP = 12
LEFT_KNEE = 13
RIGHT_KNEE = 14
LEFT_ANKLE = 15
RIGHT_ANKLE = 16


@dataclass
class HeadPose:
    pitch: float = 0.0   # positive = looking down, negative = looking up
    yaw: float = 0.0     # positive = turning right, negative = turning left
    roll: float = 0.0    # positive = tilting right, negative = tilting left
    confidence: float = 0.0
    valid: bool = False

    @property
    def direction(self) -> str:
        if not self.valid:
            return "unknown"
        if abs(self.yaw) > 25:
            return "left" if self.yaw < 0 else "right"
        if self.pitch > 30:
            return "down"
        return "forward"


class GazeEstimator:
    """Estimates head pose from YOLOv8-pose keypoint geometry.

    Uses nose-to-neck vector for pitch, left_ear-to-right_ear for yaw,
    and shoulder tilt for roll.
    """

    def __init__(self, config: dict):
        gaze_cfg = config.get("gaze", {})
        self.enabled: bool = gaze_cfg.get("enabled", True)
        self.looking_down_threshold: float = gaze_cfg.get("looking_down_threshold", -30)
        self.head_turn_threshold: float = gaze_cfg.get("head_turn_threshold", 25)

    def estimate_head_pose(self, keypoints: list[list[float]]) -> HeadPose:
        """Estimate head pose from 17 keypoints.

        Uses multiple geometric cues:
        - nose-to-neck vector -> pitch (looking up/down)
        - left_ear to right_ear vector -> yaw (looking left/right)
        - shoulder tilt -> roll
        """
        if not self.enabled:
            return HeadPose()

        nose = keypoints[NOSE] if len(keypoints) > NOSE else None
        left_ear = keypoints[LEFT_EAR] if len(keypoints) > LEFT_EAR else None
        right_ear = keypoints[RIGHT_EAR] if len(keypoints) > RIGHT_EAR else None
        left_shoulder = keypoints[LEFT_SHOULDER] if len(keypoints) > LEFT_SHOULDER else None
        right_shoulder = keypoints[RIGHT_SHOULDER] if len(keypoints) > RIGHT_SHOULDER else None
        left_eye = keypoints[LEFT_EYE] if len(keypoints) > LEFT_EYE else None
        right_eye = keypoints[RIGHT_EYE] if len(keypoints) > RIGHT_EYE else None

        valid_pts = sum(1 for p in [nose, left_ear, right_ear, left_shoulder, right_shoulder]
                        if p is not None and not self._is_zero(p))
        if valid_pts < 3:
            return HeadPose(confidence=0.0, valid=False)

        pitch = self._estimate_pitch(nose, left_eye, right_eye, left_shoulder, right_shoulder)
        yaw = self._estimate_yaw(nose, left_ear, right_ear, left_eye, right_eye)
        roll = self._estimate_roll(left_shoulder, right_shoulder)

        return HeadPose(
            pitch=round(pitch, 2),
            yaw=round(yaw, 2),
            roll=round(roll, 2),
            confidence=min(valid_pts / 5.0, 1.0),
            valid=True,
        )

    def is_looking_down(self, pose: HeadPose, threshold: Optional[float] = None) -> bool:
        if not pose.valid:
            return False
        thresh = threshold if threshold is not None else self.looking_down_threshold
        return pose.pitch > abs(thresh)

    def is_turning_head(self, pose: HeadPose, threshold: Optional[float] = None) -> bool:
        if not pose.valid:
            return False
        thresh = threshold if threshold is not None else self.head_turn_threshold
        return abs(pose.yaw) > thresh

    def _estimate_pitch(self, nose, left_eye, right_eye, left_shoulder, right_shoulder) -> float:
        """Pitch: nose-to-neck vector indicates looking down (positive) or up (negative)."""
        if nose is None or self._is_zero(nose):
            return 0.0

        # Use nose-to-midpoint-of-shoulders as the neck reference
        if left_shoulder and right_shoulder and not self._is_zero(left_shoulder) and not self._is_zero(right_shoulder):
            neck_y = (left_shoulder[1] + right_shoulder[1]) / 2
            neck_x = (left_shoulder[0] + right_shoulder[0]) / 2
        elif left_eye and right_eye and not self._is_zero(left_eye) and not self._is_zero(right_eye):
            neck_y = (left_eye[1] + right_eye[1]) / 2
            neck_x = (left_eye[0] + right_eye[0]) / 2
        else:
            return 0.0

        dy = nose[1] - neck_y
        dx = nose[0] - neck_x
        dist = math.sqrt(dx * dx + dy * dy)
        if dist < 1:
            return 0.0

        # Positive pitch = nose below neck center = looking down
        return math.degrees(math.asin(max(-1, min(1, dy / dist))))

    def _estimate_yaw(self, nose, left_ear, right_ear, left_eye, right_eye) -> float:
        """Yaw: lateral offset of nose from ear midpoint."""
        if nose is None or self._is_zero(nose):
            return 0.0

        # Prefer ear midpoint for yaw estimation
        if left_ear and right_ear and not self._is_zero(left_ear) and not self._is_zero(right_ear):
            ref_x = (left_ear[0] + right_ear[0]) / 2
            ref_y = (left_ear[1] + right_ear[1]) / 2
            ref_w = abs(right_ear[0] - left_ear[0])
        elif left_eye and right_eye and not self._is_zero(left_eye) and not self._is_zero(right_eye):
            ref_x = (left_eye[0] + right_eye[0]) / 2
            ref_y = (left_eye[1] + right_eye[1]) / 2
            ref_w = abs(right_eye[0] - left_eye[0])
        else:
            return 0.0

        if ref_w < 1:
            return 0.0

        offset = nose[0] - ref_x
        return math.degrees(math.atan2(offset, ref_w))

    def _estimate_roll(self, left_shoulder, right_shoulder) -> float:
        """Roll: shoulder tilt angle."""
        if not left_shoulder or not right_shoulder:
            return 0.0
        if self._is_zero(left_shoulder) or self._is_zero(right_shoulder):
            return 0.0

        dx = right_shoulder[0] - left_shoulder[0]
        dy = right_shoulder[1] - left_shoulder[1]
        if abs(dx) < 1:
            return 0.0

        return math.degrees(math.atan2(dy, dx))

    @staticmethod
    def _is_zero(point: list) -> bool:
        return point[0] == 0 and point[1] == 0
