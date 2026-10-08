"""
ClassroomGuard - YOLO26m Detector Training
==========================================
Fine-tunes YOLO26m on the merged classroom dataset.

All hyperparameters are loaded from yolo26_config.py — change settings there.

Usage:
    cd ai/
    python training/train_detector.py
    python training/train_detector.py --resume
    python training/train_detector.py --data path/to/custom.yaml --epochs 200
"""

import argparse
import logging
import shutil
import sys
from pathlib import Path

# Allow importing from ai/ root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from yolo26_config import YOLO26

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_detector")


def train(
    data_yaml: str = YOLO26.DATA_YAML,
    model_path: str | None = None,
    resume: bool = False,
    run_name: str = YOLO26.RUN_NAME,
    runs_dir: str = YOLO26.RUNS_DIR,
    **overrides,
):
    """
    Train YOLO26m on classroom data.

    Args:
        data_yaml:  Path to dataset YAML. Defaults to YOLO26.DATA_YAML.
        model_path: Override model weights. Defaults to YOLO26.get_model().
        resume:     Resume from last checkpoint.
        run_name:   Name for this training run (output dir).
        runs_dir:   Root directory for all training runs.
        **overrides: Any YOLO26 training kwarg to override (e.g. epochs=50).
    """
    from ultralytics import YOLO

    # Validate data yaml
    if not Path(data_yaml).exists():
        logger.error("Dataset YAML not found: %s", data_yaml)
        logger.error("Run:  python scripts/merge_datasets.py   first.")
        return None

    # Pick model
    weights = model_path or YOLO26.get_model()
    logger.info("Base model : %s", weights)
    logger.info("Dataset    : %s", data_yaml)
    logger.info("Run name   : %s", run_name)

    model = YOLO(weights)

    # Merge recommended settings with any overrides
    train_kwargs = YOLO26.as_train_kwargs()
    train_kwargs.update(overrides)

    logger.info("Starting YOLO26m fine-tuning (%d epochs)...", train_kwargs["epochs"])
    results = model.train(
        data=data_yaml,
        project=runs_dir,
        name=run_name,
        resume=resume,
        **train_kwargs,
    )

    # Copy best weights to models/
    best = Path(results.save_dir) / "weights" / "best.pt"
    if best.exists():
        dest = Path(YOLO26.CUSTOM_MODEL_OUT)
        dest.parent.mkdir(exist_ok=True)
        shutil.copy2(best, dest)
        logger.info("Best weights saved -> %s", dest)
    else:
        logger.warning("best.pt not found at %s", best)

    logger.info("Training complete. Results: %s", results.save_dir)
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Fine-tune YOLO26m on classroom phone detection data.\n"
                    "Settings come from yolo26_config.py — edit that file to change defaults.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--data",    default=YOLO26.DATA_YAML, help="Dataset YAML path")
    parser.add_argument("--model",   default=None,             help="Override base model weights")
    parser.add_argument("--epochs",  type=int, default=None,   help=f"Override epochs (default: {YOLO26.EPOCHS})")
    parser.add_argument("--batch",   type=int, default=None,   help=f"Override batch size (default: {YOLO26.BATCH})")
    parser.add_argument("--device",  type=int, default=None,   help=f"Override GPU device (default: {YOLO26.DEVICE})")
    parser.add_argument("--name",    default=YOLO26.RUN_NAME,  help="Run name")
    parser.add_argument("--resume",  action="store_true",      help="Resume from last checkpoint")
    args = parser.parse_args()

    overrides = {}
    if args.epochs is not None: overrides["epochs"] = args.epochs
    if args.batch  is not None: overrides["batch"]  = args.batch
    if args.device is not None: overrides["device"] = args.device

    train(
        data_yaml=args.data,
        model_path=args.model,
        resume=args.resume,
        run_name=args.name,
        **overrides,
    )


if __name__ == "__main__":
    main()
