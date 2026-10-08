# ClassroomGuard — AI Module

Phone & cheating detection engine using **YOLO26m** (NMS-free, 2026).

---

## Project Structure

```
ai/
│
├── yolo26_config.py          ★ SINGLE SOURCE OF TRUTH — all YOLO26 settings
│                               Edit THIS file to change any model / training param.
│                               Run it directly to see a full comparison table.
│
├── main.py                   Entry point for live camera detection
├── analyze_videos.py         Batch video processing + DB seeding
├── config.yaml               Runtime config (cameras, thresholds, dashboard)
├── requirements.txt          Python dependencies
│
├── src/                      Core detection modules
│   ├── detector.py           YOLODetector (imports yolo26_config for class normalization)
│   ├── tracker.py            ByteTracker (person tracking across frames)
│   ├── pose_analyzer.py      YOLOv8-Pose body keypoint analysis
│   ├── gaze_estimator.py     Head pose / gaze direction from keypoints
│   ├── cheating_logic.py     Rule engine (phone near person, head turns, etc.)
│   ├── false_positive_filter.py  Temporal filtering to reduce false alerts
│   ├── alert_system.py       Alert dispatch + evidence snapshot saving
│   ├── camera_manager.py     Multi-camera / video file input handling
│   └── dashboard_server.py   Flask websocket live dashboard
│
├── training/                 Model training
│   ├── train_detector.py     ★ Train YOLO26m — imports all params from yolo26_config.py
│   ├── train_pose.py         Pose model fine-tuning (YOLOv8m-pose)
│   └── classroom.yaml        Fallback dataset YAML (use merged.yaml after merge step)
│
├── scripts/                  Data utilities
│   ├── merge_datasets.py     ★ Merge all datasets + normalize class names
│   └── prepare_training_data.py  Extract frames from videos for annotation
│
├── data/                     Merged training dataset (generated)
│   └── merged_classroom/
│       ├── train/images/     Combined training images from all sources
│       ├── train/labels/     Remapped YOLO labels (unified class IDs)
│       ├── val/images/
│       ├── val/labels/
│       └── merged.yaml       ★ Dataset config used by train_detector.py
│
├── models/                   Trained model weights
│   ├── yolo26m_custom.pt     ★ Our fine-tuned YOLO26m (produced by training)
│   ├── yolov8m-pose.pt       Pose estimation model
│   └── yolov8m_custom.pt     Legacy (YOLOv8m trained model — kept for comparison)
│
├── yolo26n.pt                YOLO26 Nano (already on disk — used as cascade fast-pass)
├── yolov8m.pt                Legacy YOLOv8m base (fallback only)
│
├── runs/                     Training experiment outputs (auto-generated)
│   └── detect/
│       └── classguard-yolo26m/
│           ├── weights/best.pt
│           └── results.png
│
├── logs/                     Runtime logs + evidence snapshots
│   └── snapshots/
│
└── sample_videos/            Test videos for development
```

---

## Quick Start

### Step 1 — Install dependencies
```powershell
cd ai/
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2 — Merge datasets
```powershell
python scripts/merge_datasets.py
# Preview only (no files copied):
python scripts/merge_datasets.py --dry-run
```

### Step 3 — Train YOLO26m
```powershell
python training/train_detector.py
# Resume after interruption:
python training/train_detector.py --resume
# Custom override:
python training/train_detector.py --epochs 50 --batch 8
```

### Step 4 — Run live detection
```powershell
python main.py
python main.py --no-display          # headless
python main.py --video-dir E:/       # process videos from folder
```

### Step 5 — Batch analyze videos (seeds DB)
```powershell
python analyze_videos.py
```

---

## Configuration

### Changing model / training settings
**Edit `yolo26_config.py`** — this is the single source of truth.
All other files (`train_detector.py`, `scripts/merge_datasets.py`, `src/detector.py`)
import from it. You never need to touch multiple files.

```python
# yolo26_config.py
class YOLO26:
    EPOCHS       = 150    # Change here -> affects all training scripts
    CONF_DETECT  = 0.40   # Change here -> affects live detection
    COPY_PASTE   = 0.15   # Change here -> affects augmentation
```

### Changing camera / runtime settings
**Edit `config.yaml`** — controls cameras, alert thresholds, dashboard port.

---

## Model Comparison (Why YOLO26m)

Run this to see the full comparison:
```powershell
python yolo26_config.py
```

| Setting | YOLOv8m (old) | YOLO26m (new) | Reason |
|---|---|---|---|
| Architecture | NMS-based | NMS-free | -5~10ms per frame |
| Optimizer | AdamW (auto) | MuSGD | Better on small datasets |
| Epochs | 100 | 150 | More for small dataset |
| Freeze layers | 0 | 10 | Preserve backbone |
| copy_paste aug | 0.1 | 0.15 | More phone examples |
| erasing aug | - | 0.4 | Simulate occlusion |
| Phone conf | 0.50 | 0.35 | Catch partially hidden |
| Cache | none | ram | Faster epochs |

---

## Class Schema (Unified)

All datasets are normalized to this schema by `scripts/merge_datasets.py`:

| ID | Class | COCO equivalent |
|---|---|---|
| 0 | person | class 0 |
| 1 | cell_phone | class 67 ("cell phone") |
| 2 | calculator | — |
| 3 | cheat_sheet | — |
| 4 | earbuds | — |
