"""Train a custom YOLOv8 model for classroom object detection.

Detects: person, cell_phone, calculator, cheat_sheet, earbuds

Dataset format (YOLO):
    data/
    ├── images/train/  images/val/
    ├── labels/train/  labels/val/
    └── dataset.yaml

Usage:
    python train/train_custom.py --epochs 100 --batch 16
    python train/train_custom.py --resume models/yolov8m_custom/weights/best.pt
"""
import argparse
import logging
from pathlib import Path

from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train")

DATASET_YAML = """\
# Classroom Guard - Custom Dataset
# Classes: person, cell_phone, calculator, cheat_sheet, earbuds

path: ../data
train: images/train
val: images/val

nc: 5
names:
  0: person
  1: cell_phone
  2: calculator
  3: cheat_sheet
  4: earbuds
"""


def create_dataset_yaml(data_dir: str = "../data"):
    yaml_path = Path(data_dir) / "dataset.yaml"
    yaml_path.write_text(DATASET_YAML)
    logger.info("Dataset YAML created: %s", yaml_path)
    return str(yaml_path)


def train(args):
    data_yaml = create_dataset_yaml(args.data_dir)

    # Start from pretrained or resume
    if args.resume:
        model = YOLO(args.resume)
        logger.info("Resuming from: %s", args.resume)
    else:
        model = YOLO(args.model)
        logger.info("Starting training from: %s", args.model)

    results = model.train(
        data=data_yaml,
        epochs=args.epochs,
        batch=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        workers=args.workers,
        patience=args.patience,
        save=True,
        save_period=10,
        plots=True,
        verbose=True,
        # Augmentation
        augment=True,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        flipud=0.5,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,
        copy_paste=0.1,
    )

    logger.info("Training complete. Results saved to: %s", results.save_dir)

    # Validate
    logger.info("Running validation...")
    metrics = model.val()
    logger.info("mAP50: %.4f | mAP50-95: %.4f", metrics.box.map50, metrics.box.map)

    # Export best model
    best_pt = Path(results.save_dir) / "weights" / "best.pt"
    if best_pt.exists():
        output = Path("models") / "yolov8m_custom.pt"
        output.parent.mkdir(exist_ok=True)
        import shutil
        shutil.copy(best_pt, output)
        logger.info("Best model saved to: %s", output)

    return results


def main():
    parser = argparse.ArgumentParser(description="Train custom classroom detection model")
    parser.add_argument("--model", default="yolov8m.pt", help="Base model (default: yolov8m.pt)")
    parser.add_argument("--data-dir", default="../data", help="Dataset directory")
    parser.add_argument("--epochs", type=int, default=100, help="Training epochs")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--device", default="0", help="GPU device")
    parser.add_argument("--workers", type=int, default=4, help="DataLoader workers")
    parser.add_argument("--patience", type=int, default=20, help="Early stopping patience")
    parser.add_argument("--resume", default=None, help="Resume from checkpoint")
    args = parser.parse_args()

    train(args)


if __name__ == "__main__":
    main()
