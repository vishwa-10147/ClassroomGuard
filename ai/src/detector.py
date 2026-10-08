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
        fallback = self.config.get("fallback_weights", "yolo26m.pt")  # YOLO26m default
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

    @staticmethod
    def enhance_shadows(frame: np.ndarray) -> np.ndarray:
        """Apply CLAHE to enhance dark under-desk shadow regions."""
        lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        return cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)

    def detect(
        self, frame: np.ndarray, conf_threshold: Optional[float] = None
    ) -> list[dict]:
        conf = conf_threshold or self.config["confidence"]

        # Pass 1: Standard frame inference
        results = self.model.predict(
            source=frame,
            conf=conf,
            iou=self.config["iou_threshold"],
            imgsz=self.config["input_size"],
            device=self.config["device"],
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
                raw_name = self.class_names.get(cls_id, "unknown")
                cls_name = self._normalize_class_name(raw_name)
                detections.append(
                    {
                        "bbox": [x1, y1, x2, y2],
                        "confidence": float(c),
                        "class_id": int(cls_id),
                        "class_name": cls_name,
                        "center": [int((x1 + x2) / 2), int((y1 + y2) / 2)],
                        "width": int(x2 - x1),
                        "height": int(y2 - y1),
                    }
                )

        # Pass 2: CLAHE shadow-enhanced pass specifically for under-desk phones/calculators
        if self.config.get("enhance_shadows", True):
            enhanced_frame = self.enhance_shadows(frame)
            shadow_results = self.model.predict(
                source=enhanced_frame,
                conf=max(0.12, conf - 0.03), # slightly lower threshold for dark shadow regions
                iou=self.config["iou_threshold"],
                imgsz=self.config["input_size"],
                device=self.config["device"],
                verbose=False,
            )
            for r in shadow_results:
                if r.boxes is None:
                    continue
                boxes = r.boxes.xyxy.cpu().numpy()
                confs = r.boxes.conf.cpu().numpy()
                classes = r.boxes.cls.cpu().numpy().astype(int)

                for box, c, cls_id in zip(boxes, confs, classes):
                    raw_name = self.class_names.get(cls_id, "unknown")
                    cls_name = self._normalize_class_name(raw_name)
                    # Only add shadow detections for cheat items (phones/calculators/sheets)
                    if cls_name in ("cell_phone", "calculator", "cheat_sheet"):
                        x1, y1, x2, y2 = box.astype(int)
                        # Check IoU overlap with existing detections to avoid duplicates
                        duplicate = False
                        for existing in detections:
                            if existing["class_name"] == cls_name:
                                ex1, ey1, ex2, ey2 = existing["bbox"]
                                ix1, iy1 = max(x1, ex1), max(y1, ey1)
                                ix2, iy2 = min(x2, ex2), min(y2, ey2)
                                inter = max(0, ix2 - ix1) * max(0, iy2 - iy1)
                                union = (x2-x1)*(y2-y1) + (ex2-ex1)*(ey2-ey1) - inter
                                if union > 0 and (inter / union) > 0.4:
                                    duplicate = True
                                    # Update confidence if shadow pass is higher
                                    if c > existing["confidence"]:
                                        existing["confidence"] = float(c)
                                    break
                        if not duplicate:
                            detections.append(
                                {
                                    "bbox": [x1, y1, x2, y2],
                                    "confidence": float(c),
                                    "class_id": int(cls_id),
                                    "class_name": cls_name,
                                    "center": [int((x1 + x2) / 2), int((y1 + y2) / 2)],
                                    "width": int(x2 - x1),
                                    "height": int(y2 - y1),
                                }
                            )

        return detections

    @staticmethod
    def _normalize_class_name(name: str) -> str:
        """Normalize class names from different sources to a consistent format.
        
        Handles:
          - COCO 'cell phone' (space) → 'cell_phone'
          - Dataset 'cell-phones' (hyphen, plural) → 'cell_phone'
          - Any other space/hyphen variations
        """
        normalized = name.lower().strip().replace(" ", "_").replace("-", "_")
        # Plural → singular
        if normalized == "cell_phones":
            normalized = "cell_phone"
        return normalized

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
            "person": (0, 255, 0),          # Green
            "cell_phone": (0, 0, 255),       # Red
            "cell phone": (0, 0, 255),
            "calculator": (255, 165, 0),     # Orange
            "cheat_sheet": (255, 0, 255),    # Magenta
            "earbuds": (0, 255, 255),        # Yellow
        }
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cls = det["class_name"]
            conf = det["confidence"]
            color = colors.get(cls, (255, 255, 255))

            # Make phones and cheat items extra prominent with thicker border and highlight
            thickness = 3 if cls in ("cell_phone", "cell phone", "calculator", "cheat_sheet") else 2
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, thickness)
            
            # Draw glow / outer border for phone detection
            if cls in ("cell_phone", "cell phone"):
                cv2.rectangle(annotated, (max(0, x1 - 2), max(0, y1 - 2)), (x2 + 2, y2 + 2), (0, 255, 255), 1)

            label = f"PHONE {conf:.2f}" if cls in ("cell_phone", "cell phone") else f"{cls} {conf:.2f}"
            (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated, (x1, max(0, y1 - h - 10)), (x1 + w + 8, max(h + 10, y1)), color, -1)
            cv2.putText(
                annotated, label, (x1 + 4, max(h + 2, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (255, 255, 255), 2, cv2.LINE_AA,
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
