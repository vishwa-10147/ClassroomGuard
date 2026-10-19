import argparse
import logging
import signal
import sys
import time
from pathlib import Path

import cv2
import yaml

from src.camera_manager import CameraManager
from src.detector import YOLODetector
from src.gaze_estimator import GazeEstimator
from src.pipeline import CameraState, FrameAnalyzer
from src.pose_analyzer import PoseAnalyzer
from src.alert_system import AlertSystem
from src.dashboard_server import DashboardServer
from src.zone_sync import ZoneSync

# Ensure logs directory exists before configuring file handlers
Path("logs").mkdir(exist_ok=True)
Path("logs/snapshots").mkdir(exist_ok=True)

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

        # Tracking, false-positive filtering and rule state are per camera: track IDs and
        # pixel positions from different cameras must never be matched against each other.
        self.gaze_estimator = GazeEstimator(config)
        self.analyzer = FrameAnalyzer(config, self.detector, self.pose_analyzer, self.gaze_estimator)
        self.camera_states: dict[int, CameraState] = {}
        self.alert_system = AlertSystem(config)
        # Seat and ignore zones drawn in the web app, refreshed in the background
        self.zone_sync = ZoneSync(
            self.alert_system.backend_url.rsplit("/api/", 1)[0],
            self.alert_system.service_token,
            self.alert_system.backend_camera_codes,
        )

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

        self.zone_sync.start()

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

    def _camera_state(self, cam_id: int) -> CameraState:
        if cam_id not in self.camera_states:
            self.camera_states[cam_id] = self.analyzer.new_state()
        state = self.camera_states[cam_id]
        state.zones = self.zone_sync.get(cam_id)
        return state

    def _main_loop(self, active_cams: list[int]):
        frame_count = 0
        stats_interval = time.time()
        last_heartbeat = 0.0

        while self.running:
            loop_start = time.time()

            for cam_id in active_cams:
                ok, frame = self.camera_manager.read_frame(cam_id)
                if not ok or frame is None:
                    continue

                result = self.analyzer.analyze(self._camera_state(cam_id), frame, cam_id)
                detections, pose_analyses, tracked = result.detections, result.pose_analyses, result.tracked
                for alert, annotated_for_alerts in result.alerts:
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
                    "total_students": sum(len(st.tracker.tracks) for st in self.camera_states.values()),
                    "fps": fps_data,
                    "avg_fps": sum(fps_data.values()) / max(len(fps_data), 1),
                })
                stats_interval = time.time()

            # Heartbeat so the web app can show whether detection is running
            if time.time() - last_heartbeat > 30:
                self.alert_system.send_heartbeat({
                    c: (self.camera_manager.is_receiving(c), self.camera_manager.get_fps(c))
                    for c in self.camera_manager.streams
                })
                last_heartbeat = time.time()

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

    def stop(self):
        self.running = False
        self.camera_manager.stop_all()
        if self.dashboard:
            self.dashboard.stop()
        cv2.destroyAllWindows()
        logger.info("Classroom Guard stopped.")


def main():
    parser = argparse.ArgumentParser(description="Classroom Guard - Cheating Detection System")
    parser.add_argument("--mode", choices=["classroom", "exam"], default=None, help="Select mode profile: 'classroom' or 'exam'")
    parser.add_argument("--config", default=None, help="Config file path")
    parser.add_argument("--no-display", action="store_true", help="Run headless (no OpenCV window)")
    parser.add_argument("--export-trt", action="store_true", help="Export models to TensorRT and exit")
    parser.add_argument("--camera", type=int, default=None, help="Override: run single camera by index")
    parser.add_argument("--video-dir", type=str, default=None, help="Directory containing videos to process simultaneously")
    args = parser.parse_args()

    # Ensure logs dir exists
    Path("logs").mkdir(exist_ok=True)
    Path("logs/snapshots").mkdir(exist_ok=True)

    # Determine config file based on mode
    config_file = args.config
    if config_file is None:
        if args.mode == "exam":
            config_file = "config_exam.yaml"
        elif args.mode == "classroom":
            config_file = "config_classroom.yaml"
        else:
            config_file = "config_exam.yaml" # Default to strict exam config if unspecified

    logger.info("Loading mode configuration from: %s", config_file)
    config = load_config(config_file)

    # Override camera if specified
    if args.camera is not None:
        config["cameras"] = [c for c in config["cameras"] if c["id"] == args.camera]
        if not config["cameras"]:
            config["cameras"] = [{"id": args.camera, "name": f"Camera {args.camera}", "source": args.camera,
                                  "resolution": [1920, 1080], "fps": 30}]
                                  
    # Load all videos from a directory if specified
    if hasattr(args, 'video_dir') and args.video_dir:
        video_dir = Path(args.video_dir)
        if video_dir.exists():
            video_files = list(video_dir.glob("*.mp4")) + list(video_dir.glob("*.avi")) + list(video_dir.glob("*.mkv"))
            if video_files:
                config["cameras"] = []
                for i, v_file in enumerate(video_files):
                    config["cameras"].append({
                        "id": i,
                        "name": f"Video {i+1} ({v_file.name})",
                        "source": str(v_file.resolve()),
                        "resolution": [1920, 1080],
                        "fps": 30
                    })
                logger.info("Loaded %d videos from %s", len(video_files), args.video_dir)
            else:
                logger.warning("No videos found in %s", args.video_dir)

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
