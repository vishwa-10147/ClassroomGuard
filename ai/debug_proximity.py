"""Debug: check phone proximity to persons"""
import sys, cv2
from pathlib import Path
from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "ai" / "models"

detector = YOLO(str(MODELS_DIR / "yolov8m.pt"))

video_path = PROJECT_ROOT / "test_data" / "test1.mp4"
cap = cv2.VideoCapture(str(video_path))
total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

# Check every 3 frames, conf=0.3 (same as analyze_videos.py)
for fi in range(total):
    ok, frame = cap.read()
    if not ok:
        break
    if fi % 3 != 0:
        continue

    results = detector.predict(source=frame, conf=0.3, iou=0.45, imgsz=640, device=0, verbose=False)
    persons = []
    phones = []
    for r in results:
        if r.boxes is None:
            continue
        boxes = r.boxes.xyxy.cpu().numpy()
        confs = r.boxes.conf.cpu().numpy()
        classes = r.boxes.cls.cpu().numpy().astype(int)
        names = r.names if hasattr(r, "names") else detector.names
        for box, c, cls_id in zip(boxes, confs, classes):
            cn = names.get(int(cls_id), "unknown")
            if cn == "person":
                persons.append(box.astype(int).tolist())
            elif cn == "cell phone":
                phones.append({"bbox": box.astype(int).tolist(), "conf": float(c)})

    if phones:
        for p in phones:
            px_cx = (p["bbox"][0] + p["bbox"][2]) / 2
            px_cy = (p["bbox"][1] + p["bbox"][3]) / 2
            min_dist = 9999
            for per in persons:
                per_cx = (per[0] + per[2]) / 2
                per_cy = (per[1] + per[3]) / 2
                d = ((px_cx - per_cx)**2 + (px_cy - per_cy)**2)**0.5
                if d < min_dist:
                    min_dist = d
            if fi < 60 or fi % 24 == 0:
                print(f"Frame {fi}: {len(persons)} persons, phone conf={p['conf']:.2f} bbox={p['bbox']} dist_to_nearest_person={min_dist:.0f}")

cap.release()
print("Done")
