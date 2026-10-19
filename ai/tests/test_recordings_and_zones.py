"""Zones, video-time rules and the recording worker loop (no models, GPU or OpenCV needed)."""

import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from recording_worker import VideoClock, analyze_frames, format_video_time  # noqa: E402
from src.cheating_logic import CheatingEngine  # noqa: E402
from src.pipeline import FrameAnalyzer  # noqa: E402
from src.tracker import Track  # noqa: E402
from src.zones import ZoneMap, parse_zones  # noqa: E402

W, H = 1000, 500
SEATS = parse_zones([
    {"id": "1", "type": "seat", "label": "A1", "x": 0.0, "y": 0.0, "w": 0.5, "h": 1.0},
    {"id": "2", "type": "seat", "label": "A1-left", "x": 0.0, "y": 0.0, "w": 0.2, "h": 0.5},
    {"id": "3", "type": "ignore", "label": "Invigilator", "x": 0.8, "y": 0.0, "w": 0.2, "h": 1.0},
    {"id": "bad", "type": "seat"},  # malformed: skipped
    {"id": "4", "type": "door", "label": "x", "x": 0, "y": 0, "w": 0.1, "h": 0.1},  # unknown type
])


def test_parse_zones_skips_bad_entries():
    assert [z.id for z in SEATS] == ["1", "2", "3"]
    assert parse_zones(None) == []


def test_seat_prefers_object_position_and_smallest_zone():
    zones = ZoneMap(SEATS)
    assert zones.seat_for([300, 100, 400, 400], None, W, H) == "A1"
    assert zones.seat_for([300, 100, 400, 400], [50, 50, 70, 70], W, H) == "A1-left"
    assert zones.seat_for([600, 100, 700, 400], None, W, H) is None


def test_ignore_zone_uses_box_centre():
    zones = ZoneMap(SEATS)
    assert zones.is_ignored([850, 100, 950, 400], W, H)
    assert not zones.is_ignored([700, 100, 820, 400], W, H)  # centre at x=760


def test_rules_measure_duration_with_the_injected_clock():
    clock = VideoClock()
    engine = CheatingEngine({
        "cheating_rules": {"phone_usage": {"alert_after_seconds": 1.0, "proximity_to_person": 50}},
        "alerts": {"cooldown": 0},
    }, clock=clock)
    student = Track(track_id=1, bbox=[0, 0, 100, 200])
    phone = {"class_name": "cell_phone", "bbox": [40, 100, 60, 130], "confidence": 0.9}
    assert engine.evaluate(student, None, [phone], camera_id=0) == []
    clock.t = 0.5
    assert engine.evaluate(student, None, [phone], camera_id=0) == []
    clock.t = 1.2
    alerts = engine.evaluate(student, None, [phone], camera_id=0)
    assert [a["alert_type"] for a in alerts] == ["phone_usage"]
    assert "1.2s" in alerts[0]["message"]


class _FakeDetector:
    def __init__(self, objects):
        self.objects = objects

    def detect(self, frame):
        return [dict(o) for o in self.objects]

    def draw_detections(self, frame, detections):
        return frame


class _FakePose:
    def __init__(self, people):
        self.people = people

    def full_analysis(self, frame):
        return [dict(p) for p in self.people]

    def draw_pose(self, frame, poses):
        return frame


class _FakeGaze:
    def estimate_head_pose(self, keypoints):
        return SimpleNamespace(direction="forward")


def _analyzer(objects, people):
    config = {
        "cheating_rules": {
            "phone_usage": {"alert_after_seconds": 0.5, "proximity_to_person": 50},
            "posture": {"enabled": False},
        },
        "alerts": {"cooldown": 0, "object_cooldown": 120},
        "false_positive_filter": {"min_consecutive_frames": 2, "confidence_calibration": False},
        "tracker": {"min_hits": 1},
    }
    return FrameAnalyzer(config, _FakeDetector(objects), _FakePose(people), _FakeGaze())


STUDENT = {"bbox": [100, 100, 300, 450], "box_conf": 0.9}
INVIGILATOR = {"bbox": [850, 50, 980, 450], "box_conf": 0.9}
PHONE_AT_STUDENT = {"class_name": "cell_phone", "bbox": [180, 300, 220, 340], "confidence": 0.9}
PHONE_AT_DESK = {"class_name": "cell_phone", "bbox": [900, 300, 940, 340], "confidence": 0.9}


def _run(analyzer, zones, seconds=3.0, fps=10):
    clock = VideoClock()
    state = analyzer.new_state(clock=clock, zones=ZoneMap(zones))
    frame = np.zeros((H, W, 3), dtype=np.uint8)
    raised = []
    for i in range(int(seconds * fps)):
        clock.t = i / fps
        raised += [a for a, _ in analyzer.analyze(state, frame, cam_id=0).alerts]
    return raised


def test_pipeline_raises_one_alert_with_the_seat():
    alerts = _run(_analyzer([PHONE_AT_STUDENT], [STUDENT]), SEATS)
    assert len(alerts) == 1, "the 2-minute object cooldown allows one alert"
    assert alerts[0]["alert_type"] == "phone_usage"
    assert alerts[0]["seat_id"] == "A1"


def test_pipeline_ignores_the_invigilator_zone():
    assert _run(_analyzer([PHONE_AT_DESK], [STUDENT, INVIGILATOR]), SEATS) == []
    # Without the zone the same phone is blamed on the invigilator
    assert len(_run(_analyzer([PHONE_AT_DESK], [STUDENT, INVIGILATOR]), [])) == 1


def test_analyze_frames_reports_progress_and_alerts():
    results = {
        0: SimpleNamespace(detections=[], alerts=[]),
        10: SimpleNamespace(detections=[PHONE_AT_STUDENT], alerts=[({"message": "Phone"}, "img")]),
        20: SimpleNamespace(detections=[PHONE_AT_STUDENT], alerts=[]),
    }
    frames = [(i, i) for i in (0, 10, 20)]
    clock = VideoClock()
    alerts, progress = [], []
    detections, cancelled = analyze_frames(
        frames, fps=10, total_frames=30, analyze=lambda f: results[f], clock=clock,
        on_alert=lambda a, frame, annotated, t: alerts.append((a["message"], t)),
        on_progress=lambda c, t, d: progress.append((c, t, d)) or True,
        progress_interval_s=0,
    )
    assert (detections, cancelled) == (2, False)
    assert alerts == [("Phone", 1.0)]
    assert progress[-1] == (30, 30, 2)


def test_analyze_frames_stops_when_cancelled():
    seen = []

    def analyze(frame):
        seen.append(frame)
        return SimpleNamespace(detections=[], alerts=[])

    _, cancelled = analyze_frames(
        ((i, i) for i in range(100)), fps=25, total_frames=100, analyze=analyze, clock=VideoClock(),
        on_alert=lambda *a: None, on_progress=lambda *a: False, progress_interval_s=0,
    )
    assert cancelled and seen == [0]


def test_format_video_time():
    assert format_video_time(65.4) == "01:05"
    assert format_video_time(3725) == "1:02:05"
