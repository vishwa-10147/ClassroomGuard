import argparse
import logging
import signal
import sys
import time
from pathlib import Path

import cv2
import yaml

from src.camera_manager import CameraManager
from src.cheating_logic import CheatingEngine
from src.detector import YOLODetector
from src.gaze_estimator import GazeEstimator
from src.false_positive_filter import FalsePositiveFilter
from src.pose_analyzer import PoseAnalyzer
from src.tracker import ByteTracker, Track
from src.alert_system import AlertSystem
from src.dashboard_server import DashboardServer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("logs/classroom_guard.log"),
    ],
)
logger = logging.getLogger("classroom_guard")


def load_config(path: str = "config.yaml") -> dict:
    with open(path) as f:
        return yaml.safe_load(f)


class ClassroomGuard:
    def __init__(self, config: dict, show_display: bool = True):
        self.config = config
        self.show_display = show_display
        self.running = False

        logger.info("Initializing Classroom Guard...")

        # Load models
        self.detector = YOLODetector(config)
        self.pose_analyzer = PoseAnalyzer(config)

        # New modules
        self.tracker = ByteTracker(config)
        self.gaze_estimator = GazeEstimator(config)
        self.fp_filter = FalsePositiveFilter(config)

        self.cheating_engine = CheatingEngine(config)
        self.alert_system = AlertSystem(config)

        # Camera manager
        self.camera_manager = CameraManager(config)

        # Dashboard
        self.dashboard = None
        if config.get("dashboard", {}).get("enabled", True):
            self.dashboard = DashboardServer(config)
            self.alert_system.register_callback(self.dashboard.push_alert)

        self._start_time = time.time()

    def start(self):
        self.running = True

        # Start cameras
        results = self.camera_manager.start_all()
        active_cams = [cam_id for cam_id, ok in results.items() if ok]
        if not active_cams:
            logger.error("No cameras started. Exiting.")
            return
        logger.info("Active cameras: %s", active_cams)

        # Start dashboard
        if self.dashboard:
            self.dashboard.start()

        # Warm up GPU
        logger.info("Warming up GPU...")
        import numpy as np
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self.detector.detect(dummy)
        logger.info("GPU warm-up complete.")

        # Main loop
        try:
            self._main_loop(active_cams)
        except KeyboardInterrupt:
            logger.info("Interrupted by user")
        finally:
            self.stop()

    def _main_loop(self, active_cams: list[int]):
        frame_count = 0
        stats_interval = time.time()

        while self.running:
            loop_start = time.time()

            for cam_id in active_cams:
                ok, frame = self.camera_manager.read_frame(cam_id)
                if not ok or frame is None:
                    continue

                # 1. Detect objects (with false-positive filtering)
                raw_detections = self.detector.detect(frame)
                detections = self.fp_filter.filter_detections(raw_detections)

                persons = [d for d in detections if d["class_name"] == "person"]
                objects = [d for d in detections if d["class_name"] != "person"]

                # 2. Track students via ByteTracker
                tracked = self.tracker.update(persons)

                # 3. Pose analysis per tracked student
                pose_analyses = self.pose_analyzer.full_analysis(frame)

                # 4. Gaze estimation + match poses to tracks
                annotated_for_alerts = None
                for track in tracked:
                    best_pose = self._match_pose_to_track(track, pose_analyses)

                    # Gaze estimation from keypoints
                    head_direction = "forward"
                    yaw_val = 0.0
                    pitch_val = 0.0
                    if best_pose and "keypoints" in best_pose:
                        head_pose = self.gaze_estimator.estimate_head_pose(best_pose["keypoints"])
                        head_direction = head_pose.direction
                        yaw_val = head_pose.yaw
                        pitch_val = head_pose.pitch

                    # Update tracker with pose info
                    self.tracker.update_head_direction(track.track_id, head_direction)
                    self.tracker.update_posture(track.track_id,
                                                best_pose.get("posture", {}).get("posture", "unknown")
                                                if best_pose else "unknown")

                    # Verify object detections persist across frames
                    for obj in objects:
                        self.fp_filter.verify_object_detection(obj)

                    # 5. Evaluate cheating rules
                    alerts = self.cheating_engine.evaluate(track, best_pose, objects, cam_id)

                    # 6. Process alerts (with debounce + annotated frame for evidence)
                    if alerts and annotated_for_alerts is None:
                        annotated_for_alerts = self.detector.draw_detections(frame, detections)
                        annotated_for_alerts = self.pose_analyzer.draw_pose(annotated_for_alerts, pose_analyses)
                    for alert in alerts:
                        if self.fp_filter.should_alert(track.track_id, alert["alert_type"]):
                            self.alert_system.process_alert(alert, frame, annotated_for_alerts)

                # 7. Draw annotations
                annotated = self.detector.draw_detections(frame, detections)
                annotated = self.pose_analyzer.draw_pose(annotated, pose_analyses)

                # Draw tracking IDs
                for track in tracked:
                    x1, y1, x2, y2 = track.bbox
                    cv2.putText(
                        annotated, f"ID:{track.track_id}", (x1, y1 - 25),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1, cv2.LINE_AA,
                    )

                # FPS overlay
                fps = self.camera_manager.get_fps(cam_id)
                cv2.putText(
                    annotated, f"Cam {cam_id} | FPS: {fps:.0f}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2, cv2.LINE_AA,
                )

                if self.show_display:
                    window_name = f"Classroom Guard - Camera {cam_id}"
                    cv2.imshow(window_name, annotated)

                # Update dashboard stream (with bounding boxes)
                if self.dashboard:
                    self.dashboard.update_frame(cam_id, annotated)

            # Dashboard stats update
            if self.dashboard and time.time() - stats_interval > 2.0:
                fps_data = {str(cam_id): self.camera_manager.get_fps(cam_id) for cam_id in active_cams}
                self.dashboard.update_stats({
                    "total_students": len(self.tracker.tracks),
                    "fps": fps_data,
                    "avg_fps": sum(fps_data.values()) / max(len(fps_data), 1),
                })
                stats_interval = time.time()

            # Handle OpenCV window keys
            if self.show_display:
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    self.running = False
                elif key == ord("s"):
                    # Save screenshot
                    for cam_id in active_cams:
                        ok, frame = self.camera_manager.read_frame(cam_id)
                        if ok:
                            cv2.imwrite(f"logs/screenshot_cam{cam_id}_{int(time.time())}.jpg", frame)
                            logger.info("Screenshot saved for camera %d", cam_id)

            frame_count += 1

    def _match_pose_to_track(self, track: Track, pose_analyses: list[dict]) -> dict | None:
        track_box = track.bbox
        best_iou = 0
        best_pose = None

        for pose in pose_analyses:
            pose_box = pose["bbox"]
            iou = self._iou(track_box, pose_box)
            if iou > best_iou:
                best_iou = iou
                best_pose = pose

        return best_pose if best_iou > 0.3 else None

    @staticmethod
    def _iou(box_a, box_b) -> float:
        x1 = max(box_a[0], box_b[0])
        y1 = max(box_a[1], box_b[1])
        x2 = min(box_a[2], box_b[2])
        y2 = min(box_a[3], box_b[3])
        inter = max(0, x2 - x1) * max(0, y2 - y1)
        area_a = (box_a[2] - box_a[0]) * (box_a[3] - box_a[1])
        area_b = (box_b[2] - box_b[0]) * (box_b[3] - box_b[1])
        union = area_a + area_b - inter
        return inter / union if union > 0 else 0

    def stop(self):
        self.running = False
        self.camera_manager.stop_all()
        if self.dashboard:
            self.dashboard.stop()
        cv2.destroyAllWindows()
        logger.info("Classroom Guard stopped.")


def main():
    parser = argparse.ArgumentParser(description="Classroom Guard - Cheating Detection System")
    parser.add_argument("--config", default="config.yaml", help="Config file path")
    parser.add_argument("--no-display", action="store_true", help="Run headless (no OpenCV window)")
    parser.add_argument("--export-trt", action="store_true", help="Export models to TensorRT and exit")
    parser.add_argument("--camera", type=int, default=None, help="Override: run single camera by index")
    args = parser.parse_args()

    # Ensure logs dir exists
    Path("logs").mkdir(exist_ok=True)
    Path("logs/snapshots").mkdir(exist_ok=True)

    config = load_config(args.config)

    # Override camera if specified
    if args.camera is not None:
        config["cameras"] = [c for c in config["cameras"] if c["id"] == args.camera]
        if not config["cameras"]:
            config["cameras"] = [{"id": args.camera, "name": f"Camera {args.camera}", "source": args.camera,
                                  "resolution": [1920, 1080], "fps": 30}]

    if args.export_trt:
        logger.info("Exporting models to TensorRT...")
        detector = YOLODetector(config)
        detector.export_tensorrt(config.get("tensorrt", {}).get("export_dir", "models/"))
        logger.info("Export complete.")
        return

    guard = ClassroomGuard(config, show_display=not args.no_display)

    # Graceful shutdown
    def signal_handler(sig, frame):
        logger.info("Shutdown signal received")
        guard.stop()
        sys.exit(0)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    guard.start()


if __name__ == "__main__":
    main()
