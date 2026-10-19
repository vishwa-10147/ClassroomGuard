"""Keeps each live camera's seat and ignore zones in step with the web app."""

import logging
import threading
import time

import requests

from .zones import ZoneMap, parse_zones

logger = logging.getLogger(__name__)


class ZoneSync:
    def __init__(self, backend_url: str, service_token: str, backend_ids: dict[int, str], interval_s: float = 60.0):
        self._url = backend_url.rstrip("/")
        self._headers = {"X-Service-Token": service_token}
        self._backend_ids = backend_ids
        self._interval = interval_s
        self._zones: dict[int, ZoneMap] = {}
        self._lock = threading.Lock()
        self._enabled = bool(service_token)

    def start(self) -> None:
        if self._enabled:
            threading.Thread(target=self._run, daemon=True, name="zone-sync").start()

    def get(self, cam_id: int) -> ZoneMap:
        with self._lock:
            return self._zones.get(cam_id) or ZoneMap()

    def refresh(self) -> None:
        for cam_id, code in self._backend_ids.items():
            try:
                resp = requests.get(f"{self._url}/api/v1/cameras/{code}", headers=self._headers, timeout=5)
            except requests.RequestException as e:
                logger.debug("Zone refresh failed for %s: %s", code, e)
                continue
            if resp.status_code != 200:
                continue
            zones = ZoneMap(parse_zones(resp.json().get("zones")))
            with self._lock:
                previous = self._zones.get(cam_id)
                self._zones[cam_id] = zones
            if previous is None or previous.zones != zones.zones:
                logger.info("Camera %s: %d seat and %d ignore zones", code,
                            len(zones.seats), len(zones.zones) - len(zones.seats))

    def _run(self) -> None:
        while True:
            self.refresh()
            time.sleep(self._interval)
