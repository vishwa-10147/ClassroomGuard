import logging
import threading
import time
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

RECONNECT_AFTER_FAILURES = 50  # ~5 s of failed reads on a live stream


def is_corrupt_frame(frame: np.ndarray, grey_fraction: float = 0.5) -> bool:
    """True for decoder-corrupted frames (HEVC/H.264 missing references are filled mid-grey).

    Such frames come from packet loss on RTSP or seeking in a file; the detector fires on the
    smeared remains, so they must never reach it.
    """
    small = cv2.resize(frame, (64, 36), interpolation=cv2.INTER_AREA).astype(np.int16)
    mid_grey = np.all(np.abs(small - 128) <= 4, axis=2)
    return bool(mid_grey.mean() > grey_fraction)


class CameraStream:
    def __init__(self, camera_id: int, source, resolution: tuple = (1920, 1080), fps: int = 30):
        self.camera_id = camera_id
        self.source = source
        self.resolution = resolution
        self.target_fps = fps
        self.frame: Optional[np.ndarray] = None
        self.running = False
        self.fps_actual = 0.0
        self.frame_count = 0
        self.last_frame_at = 0.0  # time of the last good frame (camera health)
        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None
        self._cap: Optional[cv2.VideoCapture] = None

    def start(self) -> bool:
        self._cap = cv2.VideoCapture(self.source)
        if not self._cap.isOpened():
            logger.error("Camera %s failed to open source: %s", self.camera_id, self.source)
            return False

        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.resolution[0])
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.resolution[1])
        self._cap.set(cv2.CAP_PROP_FPS, self.target_fps)
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        self.running = True
        self._thread = threading.Thread(target=self._capture_loop, daemon=True)
        self._thread.start()
        logger.info("Camera %s started (source=%s, res=%s, fps=%d)",
                     self.camera_id, self.source, self.resolution, self.target_fps)
        return True

    def _is_file(self) -> bool:
        return isinstance(self.source, str) and not self.source.isdigit() and "://" not in self.source

    def _reopen(self) -> None:
        logger.warning("Camera %s: no frames - reconnecting to %s", self.camera_id, self.source)
        if self._cap:
            self._cap.release()
        self._cap = cv2.VideoCapture(self.source)
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    def _capture_loop(self):
        frame_interval = 1.0 / self.target_fps
        failures = 0
        while self.running:
            t0 = time.time()
            ret, frame = self._cap.read()
            if not ret or frame is None:
                if self._is_file():
                    # Video files loop for continuous demo / test streams
                    self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    continue
                failures += 1
                if failures >= RECONNECT_AFTER_FAILURES:
                    self._reopen()
                    failures = 0
                time.sleep(0.1)
                continue
            failures = 0
            if is_corrupt_frame(frame):
                continue

            now = time.time()
            with self._lock:
                self.frame = frame
                self.frame_count += 1
                # Delivered frame rate (smoothed), not the time one read took
                if self.last_frame_at:
                    instant = 1.0 / max(now - self.last_frame_at, 1e-6)
                    self.fps_actual = instant if not self.fps_actual else 0.9 * self.fps_actual + 0.1 * instant
                self.last_frame_at = now

            elapsed = time.time() - t0

            sleep_time = frame_interval - elapsed
            if sleep_time > 0:
                time.sleep(sleep_time)

    def read(self) -> tuple[bool, Optional[np.ndarray]]:
        with self._lock:
            if self.frame is None:
                return False, None
            return True, self.frame.copy()

    def stop(self):
        self.running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        if self._cap:
            self._cap.release()
        logger.info("Camera %s stopped", self.camera_id)

    @property
    def is_alive(self) -> bool:
        return self.running and self._thread is not None and self._thread.is_alive()


class CameraManager:
    def __init__(self, config: dict):
        self.cameras_config = config.get("cameras", [])
        self.streams: dict[int, CameraStream] = {}

    def start_all(self) -> dict[int, bool]:
        results = {}
        for cam_cfg in self.cameras_config:
            cam_id = cam_cfg["id"]
            source = cam_cfg["source"]
            res = tuple(cam_cfg.get("resolution", [1920, 1080]))
            fps = cam_cfg.get("fps", 30)

            stream = CameraStream(cam_id, source, res, fps)
            success = stream.start()
            results[cam_id] = success
            if success:
                self.streams[cam_id] = stream

        logger.info("Started cameras: %s", results)
        return results

    def read_frame(self, camera_id: int) -> tuple[bool, Optional[np.ndarray]]:
        stream = self.streams.get(camera_id)
        if stream is None:
            return False, None
        return stream.read()

    def read_all(self) -> dict[int, tuple[bool, Optional[np.ndarray]]]:
        frames = {}
        for cam_id, stream in self.streams.items():
            frames[cam_id] = stream.read()
        return frames

    def stop_all(self):
        for stream in self.streams.values():
            stream.stop()
        self.streams.clear()
        logger.info("All cameras stopped")

    def get_fps(self, camera_id: int) -> float:
        stream = self.streams.get(camera_id)
        return stream.fps_actual if stream else 0.0

    def is_receiving(self, camera_id: int, within_s: float = 10.0) -> bool:
        """True if the camera delivered a good frame in the last `within_s` seconds."""
        stream = self.streams.get(camera_id)
        return bool(stream and time.time() - stream.last_frame_at < within_s)

    def get_active_cameras(self) -> list[int]:
        return [cam_id for cam_id, s in self.streams.items() if s.is_alive]
