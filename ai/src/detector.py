import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)


class YOLODetector:
    def __init__(self, config: dict):
        self.config = config["models"]["detection"]
        self.model: Optional[YOLO] = None
        self.class_names: dict = {}
        self._load_model()

    def _load_model(self):
        weights = self.config["weights"]
        fallback = self.config.get("fallback_weights", "yolov8m.pt")
        device = self.config["device"]

        # Prefer TensorRT engine if available
        engine_path = str(Path(weights).with_suffix(".engine"))
        if Path(engine_path).exists():
            logger.info("Loading TensorRT engine: %s", engine_path)
            self.model = YOLO(engine_path)
        elif Path(weights).exists():
            logger.info("Loading model: %s", weights)
            self.model = YOLO(weights)
        else:
            logger.info("Custom weights not found, loading fallback: %s", fallback)
            self.model = YOLO(fallback)

        self.class_names = self.model.names
        logger.info("Detection model loaded. Classes: %s", list(self.class_names.values()))

    def detect(
        self, frame: np.ndarray, conf_threshold: Optional[float] = None
    ) -> list[dict]:
        conf = conf_threshold or self.config["confidence"]
        results = self.model.predict(
            source=frame,
            conf=conf,
            iou=self.config["iou_threshold"],
            imgsz=self.config["input_size"],
            device=self.config["device"],
            quantize=self.config.get("half", True),
            verbose=False,
        )

        detections = []
        for r in results:
            if r.boxes is None:
                continue
            boxes = r.boxes.xyxy.cpu().numpy()
            confs = r.boxes.conf.cpu().numpy()
            classes = r.boxes.cls.cpu().numpy().astype(int)

            for box, c, cls_id in zip(boxes, confs, classes):
                x1, y1, x2, y2 = box.astype(int)
                detections.append(
                    {
                        "bbox": [x1, y1, x2, y2],
                        "confidence": float(c),
                        "class_id": int(cls_id),
                        "class_name": self.class_names.get(cls_id, "unknown"),
                        "center": [int((x1 + x2) / 2), int((y1 + y2) / 2)],
                        "width": int(x2 - x1),
                        "height": int(y2 - y1),
                    }
                )
        return detections

    def detect_persons(self, frame: np.ndarray) -> list[dict]:
        all_dets = self.detect(frame)
        return [d for d in all_dets if d["class_name"] == "person"]

    def detect_objects(
        self, frame: np.ndarray, target_classes: list[str]
    ) -> list[dict]:
        all_dets = self.detect(frame)
        return [d for d in all_dets if d["class_name"] in target_classes]

    def draw_detections(self, frame: np.ndarray, detections: list[dict]) -> np.ndarray:
        annotated = frame.copy()
        colors = {
            "person": (0, 255, 0),
            "cell_phone": (0, 0, 255),
            "calculator": (255, 165, 0),
            "cheat_sheet": (255, 0, 255),
            "earbuds": (0, 255, 255),
        }
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cls = det["class_name"]
            conf = det["confidence"]
            color = colors.get(cls, (255, 255, 255))

            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            label = f"{cls} {conf:.2f}"
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 1)
            cv2.rectangle(annotated, (x1, y1 - h - 10), (x1 + w, y1), color, -1)
            cv2.putText(
                annotated, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (255, 255, 255), 1, cv2.LINE_AA,
            )
        return annotated

    def export_tensorrt(self, output_dir: str = "models/"):
        if self.model is None:
            logger.error("No model loaded to export")
            return

        export_path = str(Path(output_dir))
        logger.info("Exporting detection model to TensorRT FP16...")
        self.model.export(
            format="engine",
            half=self.config.get("half", True),
            imgsz=self.config["input_size"],
            workspace=self.config.get("workspace", 4) if hasattr(self.config, "get") else 4,
        )
        logger.info("TensorRT engine exported to %s", export_path)
