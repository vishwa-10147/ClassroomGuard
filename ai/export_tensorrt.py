"""Export YOLOv8 models to TensorRT FP16 for RTX 4070 deployment.

Usage:
    python export_tensorrt.py                    # export both detection + pose
    python export_tensorrt.py --task detection   # export detection only
    python export_tensorrt.py --task pose        # export pose only
"""
import argparse
import logging
from pathlib import Path

from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("export")


def export_model(weights: str, task: str, output_dir: str = "models"):
    logger.info("Exporting %s model: %s", task, weights)

    model = YOLO(weights)

    # Export to TensorRT FP16
    exported = model.export(
        format="engine",
        half=True,
        imgsz=640,
        device=0,
        workspace=4,
    )
    logger.info("Exported: %s -> %s", weights, exported)

    # Verify
    engine_path = Path(exported)
    if engine_path.exists():
        size_mb = engine_path.stat().st_size / (1024 * 1024)
        logger.info("Engine size: %.1f MB", size_mb)
    else:
        logger.warning("Engine file not found at %s", exported)

    return exported


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--task", choices=["detection", "pose", "both"], default="both")
    parser.add_argument("--det-weights", default="models/yolov8m_custom.pt")
    parser.add_argument("--pose-weights", default="yolov8m-pose.pt")
    parser.add_argument("--output-dir", default="models")
    args = parser.parse_args()

    Path(args.output_dir).mkdir(parents=True, exist_ok=True)

    if args.task in ("detection", "both"):
        w = args.det_weights if Path(args.det_weights).exists() else "yolov8m.pt"
        export_model(w, "detection", args.output_dir)

    if args.task in ("pose", "both"):
        export_model(args.pose_weights, "pose", args.output_dir)

    logger.info("All exports complete. Place .engine files in models/ for runtime.")


if __name__ == "__main__":
    main()
