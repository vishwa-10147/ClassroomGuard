import base64
import logging
import threading
import time
from typing import Optional

import cv2
import numpy as np
from flask import Flask, Response, jsonify, render_template, send_from_directory
from flask_socketio import SocketIO

logger = logging.getLogger(__name__)


class DashboardServer:
    def __init__(self, config: dict):
        dash_cfg = config.get("dashboard", {})
        self.host = dash_cfg.get("host", "0.0.0.0")
        self.port = dash_cfg.get("port", 8080)
        self.quality = dash_cfg.get("stream_quality", 80)
        self.max_fps = dash_cfg.get("max_fps_display", 15)

        self.app = Flask(
            __name__,
            template_folder="../dashboard/templates",
            static_folder="../dashboard/static",
        )
        self.socketio = SocketIO(self.app, cors_allowed_origins="*", async_mode="threading")

        self._frames: dict[int, np.ndarray] = {}
        self._alerts: list[dict] = []
        self._stats: dict = {}
        self._lock = threading.Lock()
        self._running = False

        self._setup_routes()

    def _setup_routes(self):
        @self.app.route("/")
        def index():
            return render_template("index.html")

        @self.app.route("/video/<int:camera_id>")
        def video_feed(camera_id):
            return Response(
                self._generate_stream(camera_id),
                mimetype="multipart/x-mixed-replace; boundary=frame",
            )

        @self.app.route("/api/alerts")
        def get_alerts():
            with self._lock:
                return jsonify(self._alerts[-50:])

        @self.app.route("/api/stats")
        def get_stats():
            with self._lock:
                return jsonify(self._stats)

        @self.app.route("/api/summary")
        def get_summary():
            with self._lock:
                return jsonify({
                    "alerts": self.get_alert_summary(),
                    "stats": self._stats,
                })

    def _generate_stream(self, camera_id: int):
        while self._running:
            with self._lock:
                frame = self._frames.get(camera_id)
            if frame is None:
                time.sleep(0.05)
                continue

            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, self.quality])
            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + frame_bytes
                + b"\r\n"
            )
            time.sleep(1.0 / self.max_fps)

    def update_frame(self, camera_id: int, frame: np.ndarray):
        with self._lock:
            self._frames[camera_id] = frame

    def push_alert(self, alert: dict):
        with self._lock:
            self._alerts.append(alert)
            if len(self._alerts) > 200:
                self._alerts = self._alerts[-200:]
        self.socketio.emit("new_alert", alert)

    def update_stats(self, stats: dict):
        with self._lock:
            self._stats = stats
        self.socketio.emit("stats_update", stats)

    def get_alert_summary(self) -> dict:
        counts = {}
        for a in self._alerts:
            t = a.get("alert_type", "unknown")
            counts[t] = counts.get(t, 0) + 1
        return counts

    def start(self):
        self._running = True
        thread = threading.Thread(
            target=lambda: self.socketio.run(
                self.app, host=self.host, port=self.port,
                debug=False, use_reloader=False,
            ),
            daemon=True,
        )
        thread.start()
        logger.info("Dashboard started at http://%s:%d", self.host, self.port)

    def stop(self):
        self._running = False
