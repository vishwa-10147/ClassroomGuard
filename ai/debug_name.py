"""Debug: check actual class name for cell phone"""
import sys
from pathlib import Path
from ultralytics import YOLO

sys.path.insert(0, str(Path(__file__).resolve().parent))
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MODELS_DIR = PROJECT_ROOT / "ai" / "models"

detector = YOLO(str(MODELS_DIR / "yolov8m.pt"))

# Check names from model
print("Model names[67]:", detector.names.get(67, "MISSING"))
print("Model names type:", type(detector.names))

# Now check what names come back from predict
import cv2
video_path = PROJECT_ROOT / "test_data" / "test1.mp4"
cap = cv2.VideoCapture(str(video_path))
ok, frame = cap.read()
cap.release()

results = detector.predict(source=frame, conf=0.001, iou=0.45, imgsz=640, device=0, verbose=False)
for r in results:
    if r.boxes is None:
        continue
    classes = r.boxes.cls.cpu().numpy().astype(int)
    names_r = r.names if hasattr(r, "names") else None
    if names_r:
        print("r.names type:", type(names_r))
        print("r.names[67]:", names_r.get(67, "MISSING") if isinstance(names_r, dict) else "not dict")
    for cls_id in classes[:5]:
        cls_int = int(cls_id)
        # Check both detector.names and r.names
        n1 = detector.names.get(cls_int, "MISSING")
        n2 = names_r.get(cls_int, "MISSING") if names_r and isinstance(names_r, dict) else "N/A"
        print(f"  cls_id={cls_int}: detector.names={n1}, r.names={n2}")
    break

# THE KEY TEST
print("\n=== KEY TEST ===")
print(f'detector.names[67] == "cell_phone": {detector.names.get(67) == "cell_phone"}')
print(f'detector.names[67] == "cell phone": {detector.names.get(67) == "cell phone"}')
print(f'Actual value: repr={repr(detector.names.get(67))}')
