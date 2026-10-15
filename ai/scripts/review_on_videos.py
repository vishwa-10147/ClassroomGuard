"""Run the exam detector on real exam-hall recordings and save frames for human review.

None of these recordings is used for training, so this is the closest check to deployment.
Detections are drawn and saved per video, plus a contact sheet of the highest-confidence
crops, so a person can quickly mark each one correct / false alarm. Reviewed frames are
the best next training data (see the README "Improving the model" section).

Usage (from ai/):
    .venv/Scripts/python scripts/review_on_videos.py --videos sample_videos/306-B.mp4 sample_videos/307-A-3.mp4
"""

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

AI_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AI_DIR))
from src.camera_manager import is_corrupt_frame  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--weights", default=str(AI_DIR / "models" / "exam_detector.pt"))
    ap.add_argument("--videos", nargs="+", required=True)
    ap.add_argument("--every-seconds", type=float, default=10.0)
    ap.add_argument("--max-frames", type=int, default=60)
    ap.add_argument("--imgsz", type=int, default=1280)
    ap.add_argument("--conf", type=float, default=None, help="default: thresholds from the eval report")
    ap.add_argument("--out", default=str(AI_DIR / "runs" / "video_review"))
    args = ap.parse_args()

    from ultralytics import YOLO

    model = YOLO(args.weights)
    eval_report = Path(args.weights).with_suffix(".eval.json")
    thresholds = {name: args.conf for name in model.names.values()} if args.conf else (
        json.loads(eval_report.read_text())["thresholds_from_val"] if eval_report.exists() else {}
    )
    floor = min(thresholds.values(), default=0.25)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    crops: list[tuple[float, str, np.ndarray]] = []
    summary = {}
    for video in map(Path, args.videos):
        cap = cv2.VideoCapture(str(video))
        fps = cap.get(cv2.CAP_PROP_FPS) or 20
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        step = max(1, int(fps * args.every_seconds))
        counts = {name: 0 for name in model.names.values()}
        frames = 0
        for idx in range(0, total, step):
            if frames >= args.max_frames:
                break
            # Seeking lands between keyframes: decode forward until the picture is clean
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            frame = None
            for _ in range(int(fps * 4)):
                ok, candidate = cap.read()
                if not ok:
                    break
                if not is_corrupt_frame(candidate):
                    frame = candidate
                    break
            if frame is None:
                continue
            frames += 1
            res = model.predict(frame, imgsz=args.imgsz, conf=floor, verbose=False)[0]
            kept = []
            for box, conf, cls in zip(res.boxes.xyxy.cpu().numpy(), res.boxes.conf.cpu().numpy(), res.boxes.cls.cpu().numpy()):
                name = model.names[int(cls)]
                if conf < thresholds.get(name, floor):
                    continue
                kept.append((box.astype(int), float(conf), name))
                counts[name] += 1
            if not kept:
                continue
            vis = frame.copy()
            for (x0, y0, x1, y1), conf, name in kept:
                color = (0, 0, 255) if name == "cell_phone" else (0, 165, 255)
                cv2.rectangle(vis, (x0, y0), (x1, y1), color, 3)
                cv2.putText(vis, f"{name} {conf:.2f}", (x0, max(20, y0 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.9, color, 2)
                pad = 60
                crop = frame[max(0, y0 - pad): y1 + pad, max(0, x0 - pad): x1 + pad]
                if crop.size:
                    crops.append((conf, f"{video.stem}@{idx / fps:.0f}s {name} {conf:.2f}", cv2.resize(crop, (240, 240))))
            cv2.imwrite(str(out / f"{video.stem}_{int(idx / fps):05d}s.jpg"), cv2.resize(vis, (1280, int(1280 * vis.shape[0] / vis.shape[1]))))
        summary[video.name] = {"frames_checked": frames, "detections": counts}

    crops.sort(key=lambda c: -c[0])
    tiles = []
    for _, label, img in crops[:48]:
        img = img.copy()
        cv2.rectangle(img, (0, 0), (240, 22), (0, 0, 0), -1)
        cv2.putText(img, label[:34], (3, 15), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
        tiles.append(img)
    if tiles:
        while len(tiles) % 8:
            tiles.append(np.zeros_like(tiles[0]))
        sheet = np.vstack([np.hstack(tiles[i: i + 8]) for i in range(0, len(tiles), 8)])
        cv2.imwrite(str(out / "contact_sheet.jpg"), sheet)
    (out / "summary.json").write_text(json.dumps({"thresholds": thresholds, "videos": summary}, indent=2))
    print(json.dumps(summary, indent=2))
    print(f"Review frames in {out}")


if __name__ == "__main__":
    main()
