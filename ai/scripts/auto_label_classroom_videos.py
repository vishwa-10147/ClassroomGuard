"""
ClassroomGuard - Automatic Video Auto-Labeling Pipeline
======================================================
Automatically samples frames from real classroom videos in sample_videos/,
runs high-resolution inference (imgsz=1280, conf=0.12) with our model to auto-detect
phones and students from actual ceiling camera angles, and saves YOLO dataset labels.

This generates real classroom-specific training data without any manual work!
"""
import logging
import sys
from pathlib import Path
import cv2
import yaml

AI_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = AI_DIR.parent
SAMPLE_VIDEOS_DIR = AI_DIR / "sample_videos"
AUTO_DATASET_DIR = PROJECT_ROOT / "data" / "auto_labeled_classroom"

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("auto_labeler")

def auto_label_videos(
    model_path: str = "models/yolo26m_custom.pt",
    sample_every_n_frames: int = 300,  # sample frame every ~15 seconds for maximum visual diversity
    max_frames_per_video: int = 30,    # cap at 30 frames per video for balanced representation
    conf_threshold: float = 0.12,      # sensitive threshold to capture obscure/angled phones
    img_size: int = 1280,              # high resolution for small phones
):
    from ultralytics import YOLO

    if not SAMPLE_VIDEOS_DIR.exists():
        logger.error("sample_videos directory not found at %s", SAMPLE_VIDEOS_DIR)
        return

    video_files = list(SAMPLE_VIDEOS_DIR.glob("*.mp4")) + list(SAMPLE_VIDEOS_DIR.glob("*.avi"))
    logger.info("Found %d classroom videos in %s", len(video_files), SAMPLE_VIDEOS_DIR)

    out_train_img = AUTO_DATASET_DIR / "train" / "images"
    out_train_lbl = AUTO_DATASET_DIR / "train" / "labels"
    out_val_img   = AUTO_DATASET_DIR / "valid" / "images"
    out_val_lbl   = AUTO_DATASET_DIR / "valid" / "labels"

    for d in [out_train_img, out_train_lbl, out_val_img, out_val_lbl]:
        d.mkdir(parents=True, exist_ok=True)

    logger.info("Loading detector model for auto-labeling: %s", model_path)
    detector = YOLO(model_path)

    total_images_saved = 0
    total_phones_labeled = 0

    for vid_idx, video_path in enumerate(video_files):
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            continue

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        vid_stem = video_path.stem
        logger.info("Processing [%d/%d] %s (%d frames)...", vid_idx + 1, len(video_files), vid_stem, total_frames)

        saved_from_video = 0

        for frame_idx in range(0, min(total_frames, max_frames_per_video * sample_every_n_frames), sample_every_n_frames):
            if saved_from_video >= max_frames_per_video:
                break

            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret or frame is None:
                continue

            h, w = frame.shape[:2]

            # High resolution inference to catch small phone details
            results = detector.predict(
                source=frame,
                conf=conf_threshold,
                imgsz=img_size,
                device=0,
                verbose=False,
            )[0]

            if results.boxes is not None and len(results.boxes) > 0:
                boxes = results.boxes.xywhn.cpu().numpy() # normalized xywh format for YOLO labels
                classes = results.boxes.cls.cpu().numpy().astype(int)
                confs = results.boxes.conf.cpu().numpy()

                yolo_label_lines = []
                phone_in_frame = False

                for box, cls_id, conf in zip(boxes, classes, confs):
                    cls_name = detector.names[cls_id]
                    # Map to our unified class schema: 0 = person, 1 = cell_phone, 2 = calculator, 3 = cheat_sheet, 4 = earbuds
                    unified_id = None
                    if cls_name == "person":
                        unified_id = 0
                    elif "phone" in cls_name.lower() or "cell" in cls_name.lower():
                        unified_id = 1
                        phone_in_frame = True
                        total_phones_labeled += 1
                    elif "calc" in cls_name.lower():
                        unified_id = 2
                    elif "cheat" in cls_name.lower() or "sheet" in cls_name.lower() or "paper" in cls_name.lower():
                        unified_id = 3

                    if unified_id is not None:
                        x_center, y_center, width, height = box
                        yolo_label_lines.append(f"{unified_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}")

                if yolo_label_lines:
                    # 80% train, 20% validation split
                    is_val = (total_images_saved % 5 == 0)
                    img_dest_dir = out_val_img if is_val else out_train_img
                    lbl_dest_dir = out_val_lbl if is_val else out_train_lbl

                    img_name = f"autovideo_{vid_stem}_f{frame_idx:06d}.jpg"
                    lbl_name = f"autovideo_{vid_stem}_f{frame_idx:06d}.txt"

                    cv2.imwrite(str(img_dest_dir / img_name), frame)
                    with open(lbl_dest_dir / lbl_name, "w") as f:
                        f.write("\n".join(yolo_label_lines))

                    total_images_saved += 1
                    saved_from_video += 1

        cap.release()
        logger.info("  -> Saved %d auto-labeled frames from %s", saved_from_video, vid_stem)

    # Save dataset data.yaml
    yaml_data = {
        "path": str(AUTO_DATASET_DIR.resolve()),
        "train": "train/images",
        "val": "valid/images",
        "nc": 5,
        "names": ["person", "cell_phone", "calculator", "cheat_sheet", "earbuds"],
    }
    with open(AUTO_DATASET_DIR / "data.yaml", "w") as f:
        yaml.dump(yaml_data, f, default_flow_style=False)

    logger.info("=" * 60)
    logger.info("AUTO-LABELING COMPLETE!")
    logger.info("  Total new classroom images : %d", total_images_saved)
    logger.info("  Total phone instances      : %d", total_phones_labeled)
    logger.info("  Dataset saved to           : %s", AUTO_DATASET_DIR)
    logger.info("=" * 60)

if __name__ == "__main__":
    auto_label_videos()
