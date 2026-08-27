"""Fine-tune YOLOv8m-pose on custom classroom data."""

import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_pose")

BASE_DIR = Path(__file__).resolve().parent
AI_DIR = BASE_DIR.parent


def train(data_yaml: str, epochs: int = 100, batch_size: int = 16,
          img_size: int = 640, project: str = "runs/pose", name: str = "classguard-pose",
          device: int = 0, resume: bool = False):
    from ultralytics import YOLO

    model_path = AI_DIR / "models" / "yolov8m-pose.pt"
    if not model_path.exists():
        model_path = "yolov8m-pose.pt"

    logger.info("Loading base pose model: %s", model_path)
    model = YOLO(str(model_path))

    logger.info("Starting pose fine-tuning: epochs=%d, batch=%d, imgsz=%d", epochs, batch_size, img_size)
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        batch=batch_size,
        imgsz=img_size,
        project=str(AI_DIR / project),
        name=name,
        device=device,
        exist_ok=True,
        pretrained=True,
        optimizer="auto",
        verbose=True,
        seed=42,
        deterministic=True,
        resume=resume,
    )
    logger.info("Pose training complete. Results: %s", results.save_dir)
    return results


def main():
    parser = argparse.ArgumentParser(description="Fine-tune YOLOv8m-pose")
    parser.add_argument("--data", default=str(BASE_DIR / "classroom.yaml"),
                        help="Path to dataset YAML")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--device", type=int, default=0)
    parser.add_argument("--name", default="classguard-pose")
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    train(args.data, args.epochs, args.batch, args.imgsz, device=args.device,
          name=args.name, resume=args.resume)


if __name__ == "__main__":
    main()
