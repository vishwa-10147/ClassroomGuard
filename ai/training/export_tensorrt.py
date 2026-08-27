"""Export fine-tuned models to TensorRT FP16."""

import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("export_tensorrt")

BASE_DIR = Path(__file__).resolve().parent
AI_DIR = BASE_DIR.parent
MODELS_DIR = AI_DIR / "models"


def export(model_path: str, output_dir: str, img_size: int = 640, half: bool = True):
    from ultralytics import YOLO

    logger.info("Loading model: %s", model_path)
    model = YOLO(model_path)

    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)

    logger.info("Exporting to TensorRT FP16 (imgsz=%d)...", img_size)
    result = model.export(
        format="engine",
        half=half,
        imgsz=img_size,
        workspace=4,
    )
    logger.info("Exported: %s", result)
    return result


def main():
    parser = argparse.ArgumentParser(description="Export models to TensorRT FP16")
    parser.add_argument("--model", required=True, help="Path to .pt model file")
    parser.add_argument("--output", default=str(MODELS_DIR), help="Output directory")
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--fp32", action="store_true", help="Export as FP32 instead of FP16")
    args = parser.parse_args()

    export(args.model, args.output, args.imgsz, half=not args.fp32)


if __name__ == "__main__":
    main()
