# ClassroomGuard AI engine

Detects students using a **mobile phone** or an unpermitted **calculator** on exam-hall CCTV,
and sends confirmed incidents with an evidence frame to the ClassroomGuard API.

## Pipeline

```
camera frame ──▶ corrupt-frame filter ──▶ exam detector (phone, calculator) ─┐
     (RTSP / file, auto-reconnect)                                            ├─▶ assign each object to
                └──────────────────────▶ pose model (people + wrists) ──▶ ByteTrack ┘   its nearest student
                                                                                        │
                       API ◀── evidence frame + event ◀── debounce ◀── rule: object stays ≥ 1 s
                    (X-Service-Token)                  (per student and per desk)   in hand → HIGH
                                                                                      at desk → MEDIUM
```

| Stage | Implementation |
|---|---|
| Frame capture | `src/camera_manager.py`: one thread per camera, reconnects dropped RTSP streams, drops decoder-corrupted (grey) frames |
| Object detection | `src/detector.py`: `models/exam_detector.pt` at 1280 px, FP16 on CUDA, per-class thresholds |
| People and hands | `src/pose_analyzer.py`: YOLOv8m-pose at 960 px; boxes feed the tracker, wrists decide "in hand" |
| Tracking | `src/tracker.py`: ByteTrack, one tracker per camera |
| Rules | `src/cheating_logic.py`: nearest-student assignment, persistence timers, in-hand vs. at-desk severity, calculator permission |
| False-positive control | `src/false_positive_filter.py`: multi-frame verification and alert de-duplication by student and by desk location |
| Delivery | `src/alert_system.py`: evidence frames + background push to `POST /api/v1/events` |

Head-turn and looking-down cues exist (`cheating_rules.posture`) but are **off by default**: on
fixed overhead cameras they fire on normal exam behaviour such as writing. Enable them only after
calibrating per camera.

## Models

| File | Purpose | Source |
|---|---|---|
| `models/exam_detector.pt` | Phone + calculator detector (YOLO26s, 1280 px) | Trained with `training/train_exam_detector.py` |
| `models/yolov8m-pose.pt` | Person and keypoint detection | Ultralytics release |

Weights are not stored in git. Keep the released `exam_detector.pt` in a shared location (for
example an S3 bucket) and copy it into `ai/models/` on each AI host.

## Accuracy

Evaluated with `scripts/evaluate_exam_detector.py` on data never used for training. Thresholds
were chosen on the validation split (phone 0.34, calculator 0.59), then frozen for testing.

| Test set | Class | Precision | Recall | F1 | mAP50 |
|---|---|---|---|---|---|
| All test images (387) | Phone | 0.94 | 0.74 | 0.83 | 0.87 |
| All test images (387) | Calculator | 0.83 | 0.89 | 0.86 | 0.90 |
| Unseen CCTV classroom (40 frames) | Phone | 0.93 | 0.43 | 0.59 | – |

Compared with the previous model on the same test data: phone F1 rose from 0.30 to 0.83, and
calculators went from undetectable to F1 0.86. On the unseen CCTV classroom the new model is
far more precise (0.93 vs. 0.55), so it raises far fewer false accusations.

These are **per-frame** numbers. In operation a phone must be seen for at least one second
(10+ frames), so a phone in use is very likely to be caught across frames even though any
single frame may miss it; per-frame false alarms are filtered the same way.

**Known limits**

- Calculators were validated on photos, not CCTV: none of the available CCTV footage contains a
  labelled calculator.
- Small phones at the back of large halls are the main source of misses.
- Invigilators are tracked like students; a phone in an invigilator's hand can raise an alert.

## Performance

| Hardware | Detector 1280 px + pose 960 px, FP16 | Cameras at 10 FPS |
|---|---|---|
| RTX 4070 Laptop (8 GB) | 23.6 ms per frame (42 FPS) | ~4 |
| AWS g4dn.xlarge (T4) | expect ~1.5–2x slower | ~2–3 |
| AWS g5.xlarge (A10G) | expect similar or faster | ~4–5 |

TensorRT FP16 engines (`python export_tensorrt.py` on the target GPU) are loaded automatically
when present and typically add another ~2x.

## Running

Linux:

```bash
cd ai
python3.12 -m venv .venv
.venv/bin/pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
.venv/bin/pip install -r requirements.txt
.venv/bin/python check_gpu.py              # confirms CUDA is available

# Exam mode against the API
export BACKEND_URL=http://localhost:8000
export AI_SERVICE_TOKEN=<same value as the API>
.venv/bin/python main.py --config config_exam.yaml --no-display
```

Windows (PowerShell):

```powershell
cd ai
py -3.12 -m venv .venv
.venv\Scripts\pip install torch torchvision --index-url https://download.pytorch.org/whl/cu126
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python check_gpu.py

$env:BACKEND_URL = "http://localhost:8000"
$env:AI_SERVICE_TOKEN = "<same value as the API>"
.venv\Scripts\python main.py --config config_exam.yaml --no-display
```

macOS has no CUDA support; the engine falls back to the CPU, which is too slow for live cameras.

Or with Docker: `docker compose --profile ai up -d ai` from the repository root.

| Config | Use |
|---|---|
| `config_exam.yaml` | Exam halls: phone + calculator rules, 2-minute de-duplication |
| `config_classroom.yaml` | Regular classes: phone rule only |
| `config.yaml` | Default for the Docker service |

Key settings:

| Setting | Meaning |
|---|---|
| `cameras[].source` | RTSP URL, video file or webcam index |
| `cameras[].backend_camera_id` / `backend_classroom_id` | IDs of the camera and classroom in the API |
| `models.detection.class_confidence` | Per-class thresholds from the evaluation report |
| `cheating_rules.phone_usage.alert_after_seconds` | How long a phone must stay with a student |
| `cheating_rules.calculator_usage.allowed` | `true` for exams where calculators are permitted |
| `alerts.object_cooldown` | Minimum time between alerts for the same student or desk |

## Training and evaluation

See [training/README.md](training/README.md) for the data sources, leakage controls, training
settings and evaluation protocol. Summary:

```bash
.venv/Scripts/python scripts/build_exam_dataset.py        # ~1.9k train / 155 val / 387 test images
.venv/Scripts/python training/train_exam_detector.py      # ~3.4 h on an RTX 4070 Laptop
.venv/Scripts/python scripts/evaluate_exam_detector.py    # thresholds + held-out metrics
.venv/Scripts/python scripts/review_on_videos.py --videos sample_videos/<file>.mp4
```

## Improving the model

The largest gain will come from footage of your own halls:

1. Record 15–30 minutes of a mock exam per camera position, with phones and calculators held,
   on desks, under desks and partly hidden.
2. Pre-label sampled frames with the current model (`review_on_videos.py`) and correct them in
   a labelling tool such as Label Studio or CVAT.
3. Add them to the dataset, keeping one hall out as the test split, retrain and compare with the
   evaluation script before replacing `models/exam_detector.pt`.

## Tests

```bash
cd ai && python -m pytest tests/    # rules engine, object assignment, timing, alert de-duplication
```
