"""
ClassroomGuard - Automated Dataset Merger & High-Accuracy Retraining Script
=============================================================================
1. Merges all datasets (including auto_labeled_classroom from sample videos)
2. Fine-tunes YOLO26m at 1024px resolution on RTX 4070 GPU with Mosaic & Copy-Paste augmentations
"""
import sys
import logging
from pathlib import Path

AI_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AI_DIR))

from scripts.merge_datasets import merge
from ultralytics import YOLO
import yaml

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("merge_and_retrain")

def run():
    logger.info("Step 1: Merging all datasets...")
    merged_yaml = merge(dry_run=False)

    if not merged_yaml or not merged_yaml.exists():
        logger.error("Failed to merge datasets.")
        return

    logger.info("Step 2: Starting High-Accuracy Retraining on GPU...")
    model = YOLO("models/yolo26m_custom.pt") # continue from our current checkpoint

    # Hyperparameters optimized for small object detection on classroom overhead cameras
    train_args = {
        "data": str(merged_yaml),
        "epochs": 100,
        "imgsz": 1024,
        "batch": 8,
        "device": 0,
        "workers": 2,
        "project": "runs/detect",
        "name": "classguard-yolo26m-highacc",
        "exist_ok": True,
        "pretrained": True,
        "optimizer": "MuSGD",
        "lr0": 0.005,
        "mosaic": 1.0,
        "copy_paste": 0.30,   # copy phone boxes onto random hands/desks
        "mixup": 0.15,
        "erasing": 0.30,      # simulate occluded phones
        "save": True,
        "save_period": 10,
        "val": True,
        "plots": True,
    }

    logger.info("Training configuration: %s", train_args)
    results = model.train(**train_args)

    best_weights = Path("runs/detect/classguard-yolo26m-highacc/weights/best.pt")
    if best_weights.exists():
        dest = Path("models/yolo26m_custom.pt")
        import shutil
        shutil.copy2(best_weights, dest)
        logger.info("Copied new best model to %s", dest)

    logger.info("RETRAINING COMPLETE!")

if __name__ == "__main__":
    run()
