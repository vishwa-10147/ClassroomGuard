"""Train the exam-hall object detector (cell_phone, calculator).

People are not a detector class: the pose model supplies person boxes and wrist keypoints,
and the rules engine decides whether an object is being used by a student.

Why these settings
  * Base yolo26s.pt (COCO-pretrained, already knows "cell phone"): the small model fits an
    8 GB laptop GPU at 1280 px and runs real time on 2 cameras alongside the pose model.
  * imgsz 1280: phones are ~20-30 px wide in 1280x720 CCTV frames; at 640 they shrink to
    ~10 px, below what the detector resolves reliably.
  * Horizontal flips + mosaic + scale jitter; no vertical flips or rotations (fixed
    overhead cameras never see the room upside down).
  * Early stopping on val mAP; the room-held-out test split is never seen in training.

Usage (from ai/):
    .venv/Scripts/python scripts/build_exam_dataset.py
    .venv/Scripts/python training/train_exam_detector.py
"""

import argparse
import shutil
from pathlib import Path

AI_DIR = Path(__file__).resolve().parents[1]
DATA = AI_DIR / "data" / "exam_detector" / "exam_detector.yaml"
OUT_WEIGHTS = AI_DIR / "models" / "exam_detector.pt"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="yolo26s.pt")
    ap.add_argument("--epochs", type=int, default=120)
    ap.add_argument("--imgsz", type=int, default=1280)
    ap.add_argument("--batch", type=int, default=3)  # 1280px on an 8 GB GPU
    ap.add_argument("--name", default="exam_detector")
    args = ap.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.model)
    model.train(
        data=str(DATA),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=30,
        optimizer="auto",
        cos_lr=True,
        close_mosaic=15,
        mosaic=1.0,
        mixup=0.0,
        scale=0.5,
        translate=0.1,
        fliplr=0.5,
        flipud=0.0,
        degrees=0.0,
        hsv_h=0.015,
        hsv_s=0.6,
        hsv_v=0.4,
        cache="disk",
        workers=4,
        seed=0,
        deterministic=True,
        project=str(AI_DIR / "runs"),
        name=args.name,
        exist_ok=True,
        plots=True,
    )

    best = AI_DIR / "runs" / args.name / "weights" / "best.pt"
    OUT_WEIGHTS.parent.mkdir(exist_ok=True)
    shutil.copy(best, OUT_WEIGHTS)
    print(f"Best weights copied to {OUT_WEIGHTS}")


if __name__ == "__main__":
    main()
