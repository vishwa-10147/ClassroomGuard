"""Evaluate an exam detector honestly, and compare models on the same footing.

1. Predict once at a low confidence on VAL and pick each class's threshold that maximises F1.
   Thresholds are never tuned on test.
2. On TEST, report precision / recall / F1 at those fixed thresholds (IoU >= 0.5), for all
   test images and for the CCTV-only subset - a classroom never seen in training.
3. For models whose classes match the dataset, also report Ultralytics mAP50 / mAP50-95.

Older models with other class ids can be scored with --class-map, e.g. the previous 5-class
model: --class-map "1:0,2:1" (its cell_phone=1 -> 0, calculator=2 -> 1).

Usage (from ai/):
    .venv/Scripts/python scripts/evaluate_exam_detector.py --weights models/exam_detector.pt
    .venv/Scripts/python scripts/evaluate_exam_detector.py --weights models/yolo26m_custom.pt --class-map "1:0,2:1"
"""

import argparse
import json
from pathlib import Path

import numpy as np

AI_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = AI_DIR / "data" / "exam_detector"
CLASSES = ["cell_phone", "calculator"]
IOU_MATCH = 0.5
GRID = np.round(np.arange(0.05, 0.96, 0.01), 2)
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png"}  # training's disk cache leaves .npy files alongside


def _images(split: str) -> list[Path]:
    return sorted(p for p in (DATA_DIR / split / "images").iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)


def _iou(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    x0 = np.maximum(a[:, None, 0], b[None, :, 0])
    y0 = np.maximum(a[:, None, 1], b[None, :, 1])
    x1 = np.minimum(a[:, None, 2], b[None, :, 2])
    y1 = np.minimum(a[:, None, 3], b[None, :, 3])
    inter = np.clip(x1 - x0, 0, None) * np.clip(y1 - y0, 0, None)
    area_a = (a[:, 2] - a[:, 0]) * (a[:, 3] - a[:, 1])
    area_b = (b[:, 2] - b[:, 0]) * (b[:, 3] - b[:, 1])
    return inter / (area_a[:, None] + area_b[None, :] - inter + 1e-9)


def _gt(label: Path, w: int, h: int) -> list[tuple[int, np.ndarray]]:
    out = []
    if label.exists():
        for line in label.read_text().split("\n"):
            if line.strip():
                c, x, y, bw, bh = map(float, line.split())
                out.append((int(c), np.array([(x - bw / 2) * w, (y - bh / 2) * h, (x + bw / 2) * w, (y + bh / 2) * h])))
    return out


def collect(model, images: list[Path], imgsz: int, class_map: dict[int, int]) -> list[dict]:
    """Run the model once at low confidence; keep GT and mapped predictions per image."""
    records = []
    for i in range(0, len(images), 8):
        batch = images[i : i + 8]
        for img, res in zip(batch, model.predict([str(p) for p in batch], imgsz=imgsz, conf=0.05, verbose=False)):
            h, w = res.orig_shape
            cls = np.array([class_map.get(int(c), -1) for c in res.boxes.cls.cpu().numpy()], dtype=int)
            records.append({
                "gt": _gt(img.parent.parent / "labels" / (img.stem + ".txt"), w, h),
                "boxes": res.boxes.xyxy.cpu().numpy(),
                "conf": res.boxes.conf.cpu().numpy(),
                "cls": cls,
            })
    return records


def score(records: list[dict], c: int, thr: float) -> dict:
    tp = fp = fn = 0
    for r in records:
        keep = (r["cls"] == c) & (r["conf"] >= thr)
        pred = r["boxes"][keep][np.argsort(-r["conf"][keep])]
        gt = np.array([b for gc, b in r["gt"] if gc == c]).reshape(-1, 4)
        matched = np.zeros(len(gt), bool)
        if len(pred) and len(gt):
            for row in _iou(pred, gt):
                row = np.where(matched, -1, row)
                j = int(row.argmax())
                if row[j] >= IOU_MATCH:
                    matched[j] = True
                    tp += 1
                else:
                    fp += 1
        else:
            fp += len(pred)
        fn += int((~matched).sum())
    p = tp / (tp + fp) if tp + fp else 0.0
    rc = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * p * rc / (p + rc) if p + rc else 0.0
    return {"tp": tp, "fp": fp, "fn": fn, "precision": round(p, 3), "recall": round(rc, 3), "f1": round(f1, 3)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default=str(AI_DIR / "models" / "exam_detector.pt"))
    ap.add_argument("--imgsz", type=int, default=1280)
    ap.add_argument("--class-map", default="", help='model_class:dataset_class pairs, e.g. "1:0,2:1"')
    args = ap.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.weights)
    if args.class_map:
        class_map = {int(a): int(b) for a, b in (p.split(":") for p in args.class_map.split(","))}
    else:
        class_map = {i: i for i in range(len(CLASSES))}
    present = sorted(set(class_map.values()))

    val_images = _images("val")
    test_images = _images("test")
    val = collect(model, val_images, args.imgsz, class_map)
    thresholds = {c: float(max(GRID, key=lambda t: score(val, c, t)["f1"])) for c in present}

    test = collect(model, test_images, args.imgsz, class_map)
    cctv = [r for r, p in zip(test, test_images) if p.name.startswith("cctv_")]
    report: dict = {
        "weights": args.weights,
        "imgsz": args.imgsz,
        "thresholds_from_val": {CLASSES[c]: thresholds[c] for c in present},
        "all_test": {"images": len(test), **{CLASSES[c]: score(test, c, thresholds[c]) for c in present}},
        "cctv_unseen_room": {"images": len(cctv), **{CLASSES[c]: score(cctv, c, thresholds[c]) for c in present}},
    }
    if not args.class_map:
        m = model.val(data=str(DATA_DIR / "exam_detector.yaml"), split="test", imgsz=args.imgsz, plots=True, verbose=False)
        report["test_map"] = {
            CLASSES[int(c)]: {"mAP50": round(float(m.box.ap50[i]), 3), "mAP50-95": round(float(m.box.ap[i]), 3)}
            for i, c in enumerate(m.box.ap_class_index)
        }

    out = Path(args.weights).with_suffix(".eval.json")
    out.write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))
    print(f"Saved {out}")


if __name__ == "__main__":
    main()
