# ClassroomGuard Training Dataset Structure

## Directory Layout

```
ai/training/dataset_structure/
  images/
    train/    # 70% of annotated images
    val/      # 20% of annotated images
    test/     # 10% of annotated images
  labels/
    train/    # YOLO-format .txt labels matching train/ images
    val/      # YOLO-format .txt labels matching val/ images
    test/     # YOLO-format .txt labels matching test/ images
```

## Label Format (YOLO)

Each image has a corresponding `.txt` file in `labels/` with one row per object:

```
<class_id> <x_center> <y_center> <width> <height>
```

All values normalised to `[0, 1]`. Example:

```
0 0.512 0.347 0.12 0.45
1 0.68  0.55  0.03 0.06
```

## Classes

| ID | Name | Description |
|----|------|-------------|
| 0 | person | Student / teacher |
| 1 | cell_phone | Mobile phone (in hand or on desk) |
| 2 | calculator | Scientific or basic calculator |
| 3 | cheat_sheet | Paper with notes (not allowed) |
| 4 | earbuds | Wireless earbuds / headphones |

## Data Collection Tips

1. **Capture diverse angles** — front, back, side cameras, different heights
2. **Vary lighting** — natural, fluorescent, dim
3. **Include edge cases** — phone on desk, phone in lap, partially occluded
4. **Balance classes** — at least 200 images per class, ideally 500+
5. **Use varied backgrounds** — different classrooms, board, windows

## Annotation Tools

- [Roboflow](https://roboflow.com) — web-based, exports YOLO format
- [Label Studio](https://labelstud.io) — self-hosted
- [CVAT](https://cvat.ai) — computer vision annotation tool

## Quick Start

```bash
# 1. Place images in dataset_structure/images/{train,val,test}/
# 2. Place corresponding labels in dataset_structure/labels/{train,val,test}/
# 3. Fine-tune detector:
python train_detector.py --data classroom.yaml --epochs 100 --batch 16

# 4. Fine-tune pose model:
python train_pose.py --data classroom.yaml --epochs 100 --batch 16

# 5. Export to TensorRT:
python export_tensorrt.py --model ../runs/detect/classguard-detector/weights/best.pt
python export_tensorrt.py --model ../runs/pose/classguard-pose/weights/best.pt
```

## Dataset Size Guidelines

| Dataset Size | Expected mAP | Training Time (RTX 4070) |
|-------------|-------------|-------------------------|
| 500 images  | ~0.65       | ~30 min                 |
| 2000 images | ~0.80       | ~2 hours                |
| 5000 images | ~0.88       | ~5 hours                |
| 10000+      | ~0.92+      | ~10+ hours              |

## Validation

After training, check `runs/detect/classguard-detector/` for:
- `results.csv` — per-epoch metrics
- `confusion_matrix.png` — class-wise accuracy
- `results.png` — training curves
- `weights/best.pt` — best model checkpoint
