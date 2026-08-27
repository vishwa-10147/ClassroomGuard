import logging
import threading
import time
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)


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

    def _capture_loop(self):
        frame_interval = 1.0 / self.target_fps
        while self.running:
            t0 = time.time()
            ret, frame = self._cap.read()
            if not ret:
                logger.warning("Camera %s: failed to read frame, retrying...", self.camera_id)
                time.sleep(0.1)
                continue

            with self._lock:
                self.frame = frame
                self.frame_count += 1

            elapsed = time.time() - t0
            self.fps_actual = 1.0 / max(elapsed, 1e-6)

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

    def get_active_cameras(self) -> list[int]:
        return [cam_id for cam_id, s in self.streams.items() if s.is_alive]
