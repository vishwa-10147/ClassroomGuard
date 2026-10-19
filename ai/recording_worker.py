"""Analyses uploaded exam recordings (Recordings page -> Upload Video).

Runs next to the live engine: it asks the API for the next queued recording, runs every
frame through the same pipeline as the live cameras (timed by the video, not the wall clock)
and reports each detection as an event linked to the recording. Progress shows on the
Recordings page, and Cancel there stops the job.

    python recording_worker.py --config config.yaml

Needs BACKEND_URL and AI_SERVICE_TOKEN like the live engine. The video is read from the shared
storage folder when the API and this worker share it, and downloaded otherwise.
"""

import argparse
import logging
import os
import signal
import tempfile
import time
from pathlib import Path
from typing import Callable, Iterable, Iterator, Optional

import requests
import yaml

logger = logging.getLogger("recording_worker")

PROGRESS_INTERVAL_S = 2.0


class VideoClock:
    """Seconds into the video; the rules measure durations with it."""

    def __init__(self) -> None:
        self.t = 0.0

    def __call__(self) -> float:
        return self.t


def format_video_time(seconds: float) -> str:
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"


def analyze_frames(
    frames: Iterable[tuple[int, object]],
    fps: float,
    total_frames: int,
    analyze: Callable[[object], object],
    clock: VideoClock,
    on_alert: Callable[[dict, object, object, float], None],
    on_progress: Callable[[int, int, int], bool],
    progress_interval_s: float = PROGRESS_INTERVAL_S,
) -> tuple[int, bool]:
    """Run sampled frames through `analyze`; returns (frames with a prohibited object, cancelled).

    frames yields (frame index, image). on_progress(current, total, detections) returns False
    to stop (the job was cancelled).
    """
    fps = fps if fps and fps > 0 else 25.0
    detection_frames = 0
    last_report = time.monotonic()
    current = 0
    for current, frame in frames:
        clock.t = current / fps
        result = analyze(frame)
        if any(d["class_name"] != "person" for d in result.detections):
            detection_frames += 1
        for alert, annotated in result.alerts:
            on_alert(alert, frame, annotated, clock.t)
        if time.monotonic() - last_report >= progress_interval_s:
            last_report = time.monotonic()
            if not on_progress(current, total_frames, detection_frames):
                return detection_frames, True
    on_progress(total_frames or current, total_frames or current, detection_frames)
    return detection_frames, False


def sample_frames(capture, stride: int) -> Iterator[tuple[int, object]]:
    """Every `stride`-th frame of an OpenCV capture; skipped frames are only grabbed, not decoded."""
    index = 0
    while True:
        if index % stride:
            if not capture.grab():
                return
        else:
            ok, frame = capture.read()
            if not ok or frame is None:
                return
            yield index, frame
        index += 1


class ApiClient:
    def __init__(self, base_url: str, service_token: str):
        self.base = base_url.rstrip("/") + "/api/v1/recordings"
        self.session = requests.Session()
        self.session.headers["X-Service-Token"] = service_token

    def claim(self) -> Optional[dict]:
        resp = self.session.post(f"{self.base}/claim", timeout=15)
        if resp.status_code == 204:
            return None
        resp.raise_for_status()
        return resp.json()

    def download(self, recording_id: str, dest: Path) -> None:
        with self.session.get(f"{self.base}/{recording_id}/source", stream=True, timeout=60) as resp:
            resp.raise_for_status()
            with open(dest, "wb") as f:
                for chunk in resp.iter_content(1024 * 1024):
                    f.write(chunk)

    def progress(self, recording_id: str, **body) -> bool:
        """False when staff cancelled the job."""
        try:
            resp = self.session.post(f"{self.base}/{recording_id}/progress", json=body, timeout=10)
            return not (resp.ok and resp.json().get("cancelled"))
        except requests.RequestException as e:
            logger.warning("Progress report failed: %s", e)
            return True

    def complete(self, recording_id: str, state: str, detection_count: int = 0, error: str | None = None) -> None:
        body = {"state": state, "detectionCount": detection_count}
        if error:
            body["errorMessage"] = error[:2000]
        for attempt in range(3):
            try:
                self.session.post(f"{self.base}/{recording_id}/complete", json=body, timeout=15).raise_for_status()
                return
            except requests.RequestException as e:
                logger.warning("Could not mark recording %s %s (attempt %d): %s", recording_id, state, attempt + 1, e)
                time.sleep(2 ** attempt)


class RecordingWorker:
    def __init__(self, config: dict):
        import cv2  # noqa: F401  (fail early when OpenCV is missing)

        from src.alert_system import AlertSystem
        from src.detector import YOLODetector
        from src.gaze_estimator import GazeEstimator
        from src.pipeline import FrameAnalyzer
        from src.pose_analyzer import PoseAnalyzer

        self.config = config
        cfg = config.get("recording_analysis", {})
        self.analysis_fps = float(cfg.get("analysis_fps", 10))
        self.poll_s = float(cfg.get("poll_seconds", 10))
        self.storage = Path(os.environ.get("STORAGE_PATH", "storage"))

        backend = os.environ.get("BACKEND_URL", "http://backend:8000")
        token = os.environ.get("AI_SERVICE_TOKEN", "")
        if not token:
            raise SystemExit("AI_SERVICE_TOKEN is not set - the worker cannot reach the API")
        self.api = ApiClient(backend, token)

        detector = YOLODetector(config)
        pose = PoseAnalyzer(config)
        self.analyzer = FrameAnalyzer(config, detector, pose, GazeEstimator(config))
        self.alert_system = AlertSystem(config)
        self.running = True

    def run(self) -> None:
        logger.info("Recording worker started (sampling %.0f frames/s)", self.analysis_fps)
        while self.running:
            try:
                job = self.api.claim()
            except requests.RequestException as e:
                logger.warning("API not reachable: %s", e)
                job = None
            if job is None:
                time.sleep(self.poll_s)
                continue
            self.process(job)

    def process(self, job: dict) -> None:
        import cv2

        from src.zones import ZoneMap, parse_zones

        rec_id = job["id"]
        logger.info("Analysing recording %s (%s)", rec_id, job.get("name"))
        tmp: Optional[Path] = None
        try:
            path = self.storage / "uploads" / job["filename"]
            if not path.is_file():
                tmp = Path(tempfile.mkdtemp()) / job["filename"]
                self.api.progress(rec_id, phase="downloading")
                self.api.download(rec_id, tmp)
                path = tmp

            capture = cv2.VideoCapture(str(path))
            if not capture.isOpened():
                raise RuntimeError("The video could not be opened (unsupported or damaged file)")
            fps = capture.get(cv2.CAP_PROP_FPS) or 25.0
            total = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
            stride = max(1, round(fps / self.analysis_fps))
            duration = total / fps if fps else None

            clock = VideoClock()
            state = self.analyzer.new_state(clock=clock, zones=ZoneMap(parse_zones(job.get("zones"))))
            camera_code = job.get("cameraCode") or job.get("cameraId")

            def on_alert(alert: dict, frame, annotated, t: float) -> None:
                alert["recording_id"] = rec_id
                alert["backend_camera_id"] = camera_code
                alert["video_time_s"] = round(t, 1)
                alert["timestamp"] = time.time()
                alert["message"] = f"{alert['message']} at {format_video_time(t)} in the recording"
                self.alert_system.process_alert(alert, frame, annotated)

            def on_progress(current: int, total_frames: int, detections: int) -> bool:
                return self.api.progress(
                    rec_id, currentFrame=current, totalFrames=total_frames, duration=duration,
                    phase="analysing", detectionCount=detections,
                ) and self.running

            try:
                detections, cancelled = analyze_frames(
                    sample_frames(capture, stride), fps, total,
                    lambda frame: self.analyzer.analyze(state, frame, cam_id=0),
                    clock, on_alert, on_progress,
                )
            finally:
                capture.release()
            self.alert_system.flush()
            if cancelled:
                if not self.running:  # shutting down, not cancelled by staff
                    self.api.complete(rec_id, "failed", error="The analysis worker stopped. Run the analysis again.")
                logger.info("Recording %s stopped before the end", rec_id)
                return
            self.api.complete(rec_id, "completed", detection_count=detections)
            logger.info("Recording %s done: %d frames with a prohibited object", rec_id, detections)
        except Exception as e:  # report and move on to the next job
            logger.exception("Recording %s failed", rec_id)
            self.api.complete(rec_id, "failed", error=str(e) or e.__class__.__name__)
        finally:
            if tmp is not None:
                tmp.unlink(missing_ok=True)
                tmp.parent.rmdir()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    parser = argparse.ArgumentParser(description="ClassroomGuard recording analysis worker")
    parser.add_argument("--config", default="config_exam.yaml", help="Config file path")
    args = parser.parse_args()
    with open(args.config) as f:
        config = yaml.safe_load(f)

    worker = RecordingWorker(config)

    def stop(*_):
        logger.info("Stopping after the current job")
        worker.running = False

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    worker.run()


if __name__ == "__main__":
    main()
