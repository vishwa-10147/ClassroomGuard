"""Helper to structure your custom dataset for YOLO training.

Run this to set up the directory structure, then place your images and labels.

Usage:
    python train/prepare_dataset.py --action setup
    python train/prepare_dataset.py --action validate
    python train/prepare_dataset.py --action stats
"""
import argparse
import os
from pathlib import Path


def setup_structure(data_dir: str = "../data"):
    dirs = [
        f"{data_dir}/images/train",
        f"{data_dir}/images/val",
        f"{data_dir}/labels/train",
        f"{data_dir}/labels/val",
    ]
    for d in dirs:
        Path(d).mkdir(parents=True, exist_ok=True)
    print(f"Dataset structure created at {data_dir}/")
    print("""
Next steps:
1. Place images in data/images/train/ and data/images/val/
2. Place corresponding YOLO labels in data/labels/train/ and data/labels/val/
3. Label format: <class_id> <x_center> <y_center> <width> <height> (normalized 0-1)

Classes:
  0: person
  1: cell_phone
  2: calculator
  3: cheat_sheet
  4: earbuds

Use Roboflow, CVAT, or LabelImg for annotation.
Or use existing COCO pretrained model (fine-tuning not strictly required for person/phone).
""")


def validate_dataset(data_dir: str = "../data"):
    for split in ["train", "val"]:
        img_dir = Path(data_dir) / "images" / split
        lbl_dir = Path(data_dir) / "labels" / split

        images = list(img_dir.glob("*.jpg")) + list(img_dir.glob("*.png")) + list(img_dir.glob("*.jpeg"))
        labels = list(lbl_dir.glob("*.txt"))

        img_stems = {p.stem for p in images}
        lbl_stems = {p.stem for p in labels}

        missing_labels = img_stems - lbl_stems
        orphan_labels = lbl_stems - img_stems

        print(f"\n--- {split.upper()} ---")
        print(f"  Images: {len(images)}")
        print(f"  Labels: {len(labels)}")
        if missing_labels:
            print(f"  WARNING: {len(missing_labels)} images without labels: {list(missing_labels)[:5]}")
        if orphan_labels:
            print(f"  WARNING: {len(orphan_labels)} labels without images: {list(orphan_labels)[:5]}")
        if not missing_labels and not orphan_labels and len(images) > 0:
            print(f"  OK: All images have matching labels")


def show_stats(data_dir: str = "../data"):
    class_counts = {}
    for split in ["train", "val"]:
        lbl_dir = Path(data_dir) / "labels" / split
        for lbl_file in lbl_dir.glob("*.txt"):
            with open(lbl_file) as f:
                for line in f:
                    parts = line.strip().split()
                    if parts:
                        cls_id = int(parts[0])
                        class_counts[cls_id] = class_counts.get(cls_id, 0) + 1

    names = {0: "person", 1: "cell_phone", 2: "calculator", 3: "cheat_sheet", 4: "earbuds"}
    print("\n--- Class Distribution ---")
    total = sum(class_counts.values())
    for cls_id, count in sorted(class_counts.items()):
        name = names.get(cls_id, f"class_{cls_id}")
        pct = (count / total * 100) if total > 0 else 0
        print(f"  {name}: {count} ({pct:.1f}%)")
    print(f"  Total annotations: {total}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", choices=["setup", "validate", "stats"], default="setup")
    parser.add_argument("--data-dir", default="../data")
    args = parser.parse_args()

    if args.action == "setup":
        setup_structure(args.data_dir)
    elif args.action == "validate":
        validate_dataset(args.data_dir)
    elif args.action == "stats":
        show_stats(args.data_dir)


if __name__ == "__main__":
    main()
