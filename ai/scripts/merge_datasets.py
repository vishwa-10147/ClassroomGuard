"""
ClassroomGuard - Dataset Merger
================================
Merges all classroom datasets into one unified dataset for YOLO26 training.
Class names are normalized using aliases from yolo26_config.py.

Datasets merged:
  - Classroom-Cell-Phone-Detection.v20i.yolov8   (178 train, 51 val, 24 test)
  - classroom phone detection.v2i.yolov8
  - Classroom detection.v1i.yolov8

Output:
  ai/data/merged_classroom/
    train/images/   train/labels/
    val/images/     val/labels/
    test/images/    test/labels/
    merged.yaml

Usage:
    cd ai/
    python scripts/merge_datasets.py
    python scripts/merge_datasets.py --dry-run    # preview without copying
"""

import argparse
import logging
import shutil
import sys
from pathlib import Path

import yaml

# Allow importing from ai/ root
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from yolo26_config import YOLO26

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("merge_datasets")

# ── Paths ─────────────────────────────────────────────────────────────────────
_AI_DIR      = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _AI_DIR.parent
_DATA_ROOT    = _PROJECT_ROOT / "data"
OUTPUT_DIR    = _AI_DIR / "data" / "merged_classroom"

# ── Source datasets ────────────────────────────────────────────────────────────
DATASETS = [
    {
        "path":    _DATA_ROOT / "Classroom-Cell-Phone-Detection.v20i.yolov8",
        "splits":  {"train": "train", "val": "valid", "test": "test"},
        "classes": ["cell-phones", "person"],   # class 0, 1 in this dataset
    },
    {
        "path":    _DATA_ROOT / "classroom phone detection.v2i.yolov8",
        "splits":  {"train": "train", "val": "valid", "test": "test"},
        "classes": None,   # auto-read from data.yaml
    },
    {
        "path":    _DATA_ROOT / "Classroom detection.v1i.yolov8",
        "splits":  {"train": "train", "val": "valid", "test": "test"},
        "classes": None,
    },
    {
        "path":    _DATA_ROOT / "auto_labeled_classroom",
        "splits":  {"train": "train", "val": "valid", "test": "test"},
        "classes": ["person", "cell_phone", "calculator", "cheat_sheet", "earbuds"],
    },
]


def _load_yaml_classes(dataset_path: Path) -> list[str] | None:
    """Read class names from a dataset's data.yaml."""
    for yp in list(dataset_path.glob("data.yaml")) + list(dataset_path.glob("*.yaml")):
        try:
            with open(yp) as f:
                d = yaml.safe_load(f)
            if "names" in d:
                names = d["names"]
                return [names[i] for i in sorted(names)] if isinstance(names, dict) else list(names)
        except Exception:
            continue
    return None


def _remap_line(line: str, source_classes: list[str]) -> str | None:
    """Remap a YOLO label line from source class IDs to unified YOLO26 class IDs.
    Returns None if the class is not in our unified schema (drop it).
    """
    parts = line.strip().split()
    if not parts:
        return None
    src_id = int(parts[0])
    if src_id >= len(source_classes):
        return None

    src_name   = source_classes[src_id]
    unified    = YOLO26.normalize_class(src_name)
    unified_id = {v: k for k, v in YOLO26.CLASSES.items()}.get(unified)

    if unified_id is None:
        logger.debug("Dropping unknown class '%s' (from '%s')", unified, src_name)
        return None

    return f"{unified_id} " + " ".join(parts[1:])


def _process_split(
    ds_cfg: dict,
    split_key: str,
    out_dir: Path,
    counter: dict,
    dry_run: bool,
) -> int:
    """Process one split of one dataset. Returns number of images copied."""
    ds_path      = ds_cfg["path"]
    split_folder = ds_cfg["splits"].get(split_key)
    if not split_folder:
        return 0

    images_src = ds_path / split_folder / "images"
    labels_src = ds_path / split_folder / "labels"
    if not images_src.exists():
        return 0

    src_classes = ds_cfg["classes"] or _load_yaml_classes(ds_path)
    if src_classes is None:
        logger.warning("Cannot determine classes for %s — skipping", ds_path.name)
        return 0

    out_img = out_dir / "images"
    out_lbl = out_dir / "labels"
    if not dry_run:
        out_img.mkdir(parents=True, exist_ok=True)
        out_lbl.mkdir(parents=True, exist_ok=True)

    ds_tag  = ds_path.name[:18].replace(" ", "_")
    copied  = 0

    for img_file in sorted(images_src.iterdir()):
        if img_file.suffix.lower() not in {".jpg", ".jpeg", ".png", ".bmp", ".webp"}:
            continue

        lbl_file  = labels_src / (img_file.stem + ".txt")
        new_stem  = f"{ds_tag}_{counter[split_key]:06d}"
        new_img   = out_img / (new_stem + img_file.suffix)
        new_lbl   = out_lbl / (new_stem + ".txt")

        # Remap labels
        remapped = []
        if lbl_file.exists():
            for line in lbl_file.read_text().splitlines():
                r = _remap_line(line, src_classes)
                if r:
                    remapped.append(r)

        if not dry_run:
            shutil.copy2(img_file, new_img)
            new_lbl.write_text("\n".join(remapped))

        counter[split_key] += 1
        copied += 1

    return copied


def _write_yaml(out_dir: Path) -> Path:
    """Write the merged dataset YAML file."""
    content = {
        "path":  str(out_dir.resolve()),
        "train": "train/images",
        "val":   "val/images",
        "test":  "test/images",
        "nc":    YOLO26.NC,
        "names": YOLO26.CLASSES,
    }
    out_yaml = out_dir / "merged.yaml"
    with open(out_yaml, "w") as f:
        yaml.dump(content, f, default_flow_style=False, sort_keys=False)
    return out_yaml


def merge(dry_run: bool = False) -> Path | None:
    """Run the full merge. Returns path to merged.yaml."""
    logger.info("Output dir: %s%s", OUTPUT_DIR, " [DRY RUN]" if dry_run else "")

    if not dry_run:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    counter = {"train": 0, "val": 0, "test": 0}
    total   = {"train": 0, "val": 0, "test": 0}

    for ds_cfg in DATASETS:
        if not ds_cfg["path"].exists():
            logger.warning("Dataset not found, skipping: %s", ds_cfg["path"])
            continue
        logger.info("Processing: %s", ds_cfg["path"].name)

        for split in ("train", "val", "test"):
            n = _process_split(ds_cfg, split, OUTPUT_DIR / split, counter, dry_run)
            total[split] += n
            if n:
                logger.info("  [%s] %s: %d images", ds_cfg["path"].name[:20], split, n)

    yaml_path = None
    if not dry_run:
        yaml_path = _write_yaml(OUTPUT_DIR)
        logger.info("YAML written: %s", yaml_path)

    logger.info("\n  Merge complete!")
    logger.info("  train : %d images", total["train"])
    logger.info("  val   : %d images", total["val"])
    logger.info("  test  : %d images", total["test"])
    logger.info("  total : %d images", sum(total.values()))
    if not dry_run:
        logger.info("\n  Next step:")
        logger.info("    python training/train_detector.py")

    return yaml_path


def main():
    parser = argparse.ArgumentParser(
        description="Merge all classroom datasets into one unified YOLO26 dataset.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview merge without copying any files")
    args = parser.parse_args()
    merge(dry_run=args.dry_run)


if __name__ == "__main__":
    main()
