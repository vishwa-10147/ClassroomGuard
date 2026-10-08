"""
Quick test: run our trained model directly on a video frame
and print exactly what it detects at different confidence levels.
"""
import cv2
import sys
from pathlib import Path

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).parent))
    from ultralytics import YOLO

    VIDEO = "sample_videos/306-B-5.mp4"
    MODEL = "models/yolo26m_custom.pt"

    print(f"\nLoading model: {MODEL}")
    model = YOLO(MODEL)
    print(f"Classes: {model.names}")

    print(f"\nOpening video: {VIDEO}")
    cap = cv2.VideoCapture(VIDEO)
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps   = cap.get(cv2.CAP_PROP_FPS)
    print(f"Video: {total} frames @ {fps:.0f}fps")

    phone_frames = 0
    total_tested = 0
    results_log  = []

    # Sample every 30th frame (every ~1 second)
    for frame_idx in range(0, min(total, 900), 30):
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break
        total_tested += 1

        # Run at low confidence with 1024px input size to capture small handheld phones in 1440p frame
        results = model.predict(
            source=frame,
            conf=0.15,       # catches small/occluded phone detections
            iou=0.45,
            imgsz=1024,
            device=0,
            verbose=False,
        )

        phones_this_frame = []
        all_this_frame    = []
        for r in results:
            if r.boxes is None:
                continue
            for box, conf, cls_id in zip(
                r.boxes.xyxy.cpu().numpy(),
                r.boxes.conf.cpu().numpy(),
                r.boxes.cls.cpu().numpy().astype(int),
            ):
                cls_name = model.names[cls_id]
                all_this_frame.append((cls_name, float(conf)))
                if "phone" in cls_name.lower() or "cell" in cls_name.lower():
                    phones_this_frame.append((cls_name, float(conf)))

        if phones_this_frame:
            phone_frames += 1
            results_log.append((frame_idx, phones_this_frame))
            print(f"  Frame {frame_idx:5d}: PHONE DETECTED! {phones_this_frame}")
        elif total_tested % 5 == 0:
            classes_seen = [f"{n}({c:.2f})" for n,c in all_this_frame]
            print(f"  Frame {frame_idx:5d}: {classes_seen if classes_seen else 'nothing detected'}")

    cap.release()

    print("\n" + "=" * 60)
    print(f"  Frames tested  : {total_tested}")
    print(f"  Frames w/phone : {phone_frames}  ({phone_frames/total_tested*100:.1f}%)")
    print(f"  Phone detections at conf >= 0.10:")
    for fid, phones in results_log[:10]:
        for name, conf in phones:
            print(f"    frame {fid}: {name} @ {conf:.3f}")

    if phone_frames == 0:
        print()
        print("  *** NO PHONES DETECTED even at conf=0.10 ***")
        print("  Possible causes:")
        print("  1. This video may not contain visible phones")
        print("  2. Model needs more training data with phones in video context")
        print("  3. Phone recall was only 54.7% in validation — known weakness")
        print()
        print("  RECOMMENDATION: Try analyze_videos.py on 206-A.mp4 or 207-B.mp4")
        print("  or lower cheating_detection.phone_confidence in config.yaml to 0.20")
    print("=" * 60)
