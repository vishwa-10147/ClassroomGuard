# Training the exam detector

How the `cell_phone` / `calculator` detector in `ai/models/exam_detector.pt` is built,
trained and evaluated. Results and model details are in [../README.md](../README.md).

## Pipeline

| Step | Command (from `ai/`) | Output |
|---|---|---|
| 1. Build dataset | `.venv/Scripts/python scripts/build_exam_dataset.py` | `data/exam_detector/` with train / val / test splits |
| 2. Train | `.venv/Scripts/python training/train_exam_detector.py` | `runs/exam_detector/`, best weights copied to `models/exam_detector.pt` |
| 3. Evaluate | `.venv/Scripts/python scripts/evaluate_exam_detector.py` | `models/exam_detector.eval.json` (thresholds + test metrics) |
| 4. Review on real footage | `.venv/Scripts/python scripts/review_on_videos.py --videos sample_videos/<file>.mp4` | `runs/video_review/` annotated frames + contact sheet |

On Linux/macOS use `.venv/bin/python`.

## Data sources

| Source | Content | Licence | Split |
|---|---|---|---|
| Roboflow "Classroom Cell Phone Detection" v20 + "classroom phone detection" v2 (`data/`) | Overhead CCTV frames from classrooms, phone boxes | CC BY 4.0 | By classroom: Class_1 → test, Class_4 → val, Class_2/3 → train |
| Open Images V6 (`data/openimages/`) | Human-verified *Calculator* and *Mobile phone* boxes | CC BY 4.0 | Official train / validation / test |
| LVIS v1 (`data/lvis/`) | Calculator images with exhaustive calculator labels | CC BY 4.0 | LVIS train → train, LVIS val → val |

Rules applied by the builder:

- Frames shared by the two Roboflow sets are de-duplicated by original file name.
- CCTV frames are split **by classroom**, not by frame, so test frames come from a room the
  model never saw; adjacent frames of one video cannot leak between splits.
- Only the phone class is kept from the Roboflow sets: their "person" label marks phone users
  only. People are found at runtime by the pose model.
- Open Images images containing group-of or depiction boxes are dropped.

## Training settings

`training/train_exam_detector.py` fine-tunes COCO-pretrained `yolo26s.pt`:

| Setting | Value | Why |
|---|---|---|
| Input size | 1280 | Phones are ~20–30 px wide in 1280×720 CCTV frames |
| Batch | 3 | Fits an 8 GB laptop GPU at 1280 px without spilling into shared memory |
| Epochs / patience | 120 / 30 | Early stopping on validation mAP |
| Augmentation | mosaic, scale 0.5, translate 0.1, horizontal flip, HSV jitter | Fixed overhead cameras: no vertical flips or rotations |
| Seed | 0, deterministic | Reproducible runs |

## Evaluation protocol

`scripts/evaluate_exam_detector.py`:

1. Predicts the **validation** split once and picks, per class, the confidence threshold with the
   best F1. Thresholds are never tuned on test data.
2. Reports precision, recall and F1 at those thresholds (IoU ≥ 0.5) on the **test** split, both
   overall and for the unseen CCTV classroom alone, plus mAP50 / mAP50-95.
3. Older models with different class ids can be compared on the same footing with
   `--class-map`, e.g. `--class-map "1:0,2:1"` for the previous five-class model.

Copy the thresholds from the report into `models.detection.class_confidence` in
`config_exam.yaml`.

## Label format

YOLO text files, one row per object, coordinates normalised to `[0, 1]`:

```
<class_id> <x_center> <y_center> <width> <height>
```

| ID | Class |
|---|---|
| 0 | `cell_phone` |
| 1 | `calculator` |
