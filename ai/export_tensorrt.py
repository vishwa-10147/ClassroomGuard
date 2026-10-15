"""Export the detection and pose models to TensorRT FP16 engines for the deployment GPU.

A TensorRT engine has a fixed input size and is tied to the GPU model and TensorRT
version it was built on, so build it on the machine that will run it (e.g. the AWS
g4dn/g5 instance), using the same input sizes as the runtime config. The detector and
pose analyzer automatically prefer `<weights>.engine` when it sits next to the weights.

Requires: pip install tensorrt  (Linux x86_64 / Windows with CUDA 12)

Usage (from ai/):
    python export_tensorrt.py                         # both models, sizes from config_exam.yaml
    python export_tensorrt.py --config config.yaml --task detection
"""

import argparse
import logging
from pathlib import Path

import yaml
from ultralytics import YOLO

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("export")


def export_model(weights: str, imgsz: int, workspace: int) -> Path:
    logger.info("Exporting %s at imgsz=%d (FP16)", weights, imgsz)
    exported = Path(YOLO(weights).export(format="engine", quantize=16, imgsz=imgsz, device=0, workspace=workspace))
    logger.info("Engine: %s (%.1f MB)", exported, exported.stat().st_size / 1e6)
    return exported


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config_exam.yaml")
    parser.add_argument("--task", choices=["detection", "pose", "both"], default="both")
    args = parser.parse_args()

    cfg = yaml.safe_load(Path(args.config).read_text())
    workspace = cfg.get("tensorrt", {}).get("workspace", 4)
    if args.task in ("detection", "both"):
        det = cfg["models"]["detection"]
        export_model(det["weights"], det["input_size"], workspace)
    if args.task in ("pose", "both"):
        pose = cfg["models"]["pose"]
        export_model(pose["weights"], pose["input_size"], workspace)


if __name__ == "__main__":
    main()
