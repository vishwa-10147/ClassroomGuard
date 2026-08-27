import logging
import math
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

# MediaPipe / YOLOv8-pose keypoint indices (17 keypoints)
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


class PoseAnalyzer:
    def __init__(self, config: dict):
        self.config = config["models"]["pose"]
        self.rules = config.get("cheating_rules", {}).get("posture", {})
        self.model: Optional[YOLO] = None
        self._load_model()

    def _load_model(self):
        weights = self.config["weights"]
        engine_path = str(Path(weights).with_suffix(".engine"))
        try:
            if Path(engine_path).exists():
                logger.info("Loading TensorRT pose engine: %s", engine_path)
                self.model = YOLO(engine_path)
            else:
                self.model = YOLO(weights)
                logger.info("Pose model loaded: %s", weights)
        except Exception as e:
            logger.error("Failed to load pose model %s: %s", weights, e)
            raise

    def estimate_pose(self, frame: np.ndarray) -> list[dict]:
        results = self.model.predict(
            source=frame,
            conf=self.config["confidence"],
            imgsz=self.config["input_size"],
            device=self.config["device"],
            quantize=self.config.get("half", True),
            verbose=False,
        )

        poses = []
        for r in results:
            if r.keypoints is None:
                continue
            kpts = r.keypoints.xy.cpu().numpy()
            kpts_conf = r.keypoints.conf.cpu().numpy() if r.keypoints.conf is not None else None
            boxes = r.boxes.xyxy.cpu().numpy() if r.boxes is not None else []

            for i, person_kpts in enumerate(kpts):
                box = boxes[i].astype(int).tolist() if i < len(boxes) else [0, 0, 0, 0]
                conf = float(kpts_conf[i].mean()) if kpts_conf is not None else 0.0
                poses.append({
                    "keypoints": person_kpts.tolist(),
                    "keypoint_conf": kpts_conf[i].tolist() if kpts_conf is not None else [],
                    "bbox": box,
                    "confidence": conf,
                })
        return poses

    def analyze_head_direction(self, keypoints: list[list[float]]) -> dict:
        nose = keypoints[NOSE]
        left_eye = keypoints[LEFT_EYE]
        right_eye = keypoints[RIGHT_EYE]
        left_ear = keypoints[LEFT_EAR]
        right_ear = keypoints[RIGHT_EAR]

        if any(self._is_invalid(p) for p in [nose, left_eye, right_eye]):
            return {"direction": "unknown", "yaw": 0.0, "pitch": 0.0}

        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        eye_center_y = (left_eye[1] + right_eye[1]) / 2

        # Yaw: horizontal head turn (left/right)
        eye_width = abs(right_eye[0] - left_eye[0])
        if eye_width < 1:
            yaw = 0.0
        else:
            nose_offset = nose[0] - eye_center_x
            yaw = math.degrees(math.atan2(nose_offset, eye_width))

        # Pitch: vertical head tilt (up/down)
        eye_to_nose_dist = abs(nose[1] - eye_center_y)
        if eye_width < 1:
            pitch = 0.0
        else:
            pitch = math.degrees(math.atan2(eye_to_nose_dist, eye_width))

        # Determine direction
        direction = "forward"
        if abs(yaw) > self.rules.get("head_turn_threshold", 25):
            direction = "left" if yaw < 0 else "right"
        elif pitch > self.rules.get("looking_down_threshold", 30):
            direction = "down"

        return {"direction": direction, "yaw": round(yaw, 2), "pitch": round(pitch, 2)}

    def analyze_posture(self, keypoints: list[list[float]]) -> dict:
        left_shoulder = keypoints[LEFT_SHOULDER]
        right_shoulder = keypoints[RIGHT_SHOULDER]
        left_hip = keypoints[LEFT_HIP]
        right_hip = keypoints[RIGHT_HIP]
        nose = keypoints[NOSE]

        if any(self._is_invalid(p) for p in [left_shoulder, right_shoulder, left_hip, right_hip]):
            return {"posture": "unknown", "suspicious": False}

        # Shoulder tilt
        shoulder_diff = left_shoulder[1] - right_shoulder[1]
        shoulder_width = abs(right_shoulder[0] - left_shoulder[0])
        shoulder_tilt = math.degrees(math.atan2(shoulder_diff, max(shoulder_width, 1)))

        # Torso lean (shoulder center to hip center)
        shoulder_center_y = (left_shoulder[1] + right_shoulder[1]) / 2
        hip_center_y = (left_hip[1] + right_hip[1]) / 2
        torso_length = abs(shoulder_center_y - hip_center_y)

        # Is person sitting or standing?
        hip_to_nose = abs(nose[1] - (left_hip[1] + right_hip[1]) / 2)
        is_sitting = torso_length > 0 and (hip_to_nose / torso_length) < 2.0

        posture = "sitting" if is_sitting else "standing"
        suspicious = abs(shoulder_tilt) > 15 or not is_sitting

        return {
            "posture": posture,
            "shoulder_tilt": round(shoulder_tilt, 2),
            "torso_length": round(torso_length, 2),
            "suspicious": suspicious,
        }

    def analyze_hand_position(self, keypoints: list[list[float]]) -> dict:
        left_wrist = keypoints[LEFT_WRIST]
        right_wrist = keypoints[RIGHT_WRIST]
        left_shoulder = keypoints[LEFT_SHOULDER]
        right_shoulder = keypoints[RIGHT_SHOULDER]

        if any(self._is_invalid(p) for p in [left_wrist, right_wrist, left_shoulder, right_shoulder]):
            return {"hands_up": False, "hands_close": False}

        shoulder_center_y = (left_shoulder[1] + right_shoulder[1]) / 2
        wrist_avg_y = (left_wrist[1] + right_wrist[1]) / 2

        # Hands raised above shoulders (possible phone use)
        hands_up = wrist_avg_y < shoulder_center_y - 30

        # Hands close together (possible passing objects)
        hand_dist = math.sqrt(
            (left_wrist[0] - right_wrist[0]) ** 2 + (left_wrist[1] - right_wrist[1]) ** 2
        )
        hands_close = hand_dist < 80

        return {
            "hands_up": hands_up,
            "hands_close": hands_close,
            "hand_distance": round(hand_dist, 2),
        }

    def full_analysis(self, frame: np.ndarray) -> list[dict]:
        poses = self.estimate_pose(frame)
        analyses = []
        for pose in poses:
            kpts = pose["keypoints"]
            head = self.analyze_head_direction(kpts)
            posture = self.analyze_posture(kpts)
            hands = self.analyze_hand_position(kpts)
            analyses.append({
                "bbox": pose["bbox"],
                "confidence": pose["confidence"],
                "head": head,
                "posture": posture,
                "hands": hands,
            })
        return analyses

    def draw_pose(self, frame: np.ndarray, analyses: list[dict]) -> np.ndarray:
        annotated = frame.copy()
        skeleton_pairs = [
            (LEFT_SHOULDER, RIGHT_SHOULDER), (LEFT_SHOULDER, LEFT_ELBOW),
            (LEFT_ELBOW, LEFT_WRIST), (RIGHT_SHOULDER, RIGHT_ELBOW),
            (RIGHT_ELBOW, RIGHT_WRIST), (LEFT_SHOULDER, LEFT_HIP),
            (RIGHT_SHOULDER, RIGHT_HIP), (LEFT_HIP, RIGHT_HIP),
            (LEFT_HIP, LEFT_KNEE), (LEFT_KNEE, LEFT_ANKLE),
            (RIGHT_HIP, RIGHT_KNEE), (RIGHT_KNEE, RIGHT_ANKLE),
        ]

        for analysis in analyses:
            bbox = analysis["bbox"]
            head = analysis["head"]
            posture = analysis["posture"]

            color = (0, 255, 0) if not posture.get("suspicious") else (0, 0, 255)
            cv2.rectangle(annotated, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 2)

            info_text = f"{head['direction']} | {posture['posture']}"
            cv2.putText(
                annotated, info_text, (bbox[0], bbox[1] - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA,
            )

        return annotated

    @staticmethod
    def _is_invalid(point: list) -> bool:
        if point is None or len(point) < 2:
            return True
        return point[0] == 0 and point[1] == 0
