"""Unit tests for the cheating rules engine and false-positive verifier (no models/GPU needed)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.cheating_logic import CheatingEngine  # noqa: E402
from src.false_positive_filter import MultiFrameVerifier  # noqa: E402
from src.tracker import Track  # noqa: E402


def _det(cls: str, bbox: list[int], conf: float = 0.9) -> dict:
    return {"class_name": cls, "bbox": bbox, "confidence": conf}


def _config(**rules) -> dict:
    base = {
        "phone_usage": {"enabled": True, "alert_after_frames": 1, "proximity_to_person": 50},
        "calculator_usage": {"enabled": True, "alert_after_frames": 1, "allowed_sections": []},
        "posture": {"enabled": True, "head_turn_duration": 2.0, "looking_down_duration": 2.0},
    }
    base.update(rules)
    return {"cheating_rules": base, "alerts": {"cooldown": 0}}


STUDENT_A = Track(track_id=1, bbox=[0, 0, 100, 200])
STUDENT_B = Track(track_id=2, bbox=[1000, 0, 1100, 200])
PHONE_NEAR_B = _det("cell_phone", [1050, 100, 1070, 130])


def test_phone_rule_disabled_does_not_crash_on_hands_up():
    engine = CheatingEngine(_config(phone_usage={"enabled": False}))
    pose = {"head": {"direction": "forward"}, "hands": {"hands_up": True}}
    assert engine.evaluate(STUDENT_A, pose, [PHONE_NEAR_B], camera_id=0) == []


def test_phone_alert_uses_any_nearby_phone_not_just_the_first():
    engine = CheatingEngine(_config())
    far_phone = _det("cell_phone", [500, 500, 520, 530])
    alerts = engine.evaluate(STUDENT_B, None, [far_phone, PHONE_NEAR_B], camera_id=0)
    assert [a["alert_type"] for a in alerts] == ["phone_usage"]
    assert alerts[0]["phone_bbox"] == PHONE_NEAR_B["bbox"]


def test_phone_far_away_does_not_flag_student():
    engine = CheatingEngine(_config())
    assert engine.evaluate(STUDENT_A, None, [PHONE_NEAR_B], camera_id=0) == []


def test_calculator_only_flags_the_student_near_it():
    engine = CheatingEngine(_config())
    calc = _det("calculator", [1040, 100, 1080, 140])
    assert engine.evaluate(STUDENT_A, None, [calc], camera_id=0) == []
    alerts = engine.evaluate(STUDENT_B, None, [calc], camera_id=0)
    assert [a["alert_type"] for a in alerts] == ["calculator_usage"]


def test_head_turn_duration_is_time_based(monkeypatch):
    import src.cheating_logic as logic

    clock = iter([100.0, 102.5, 102.5])
    monkeypatch.setattr(logic.time, "time", lambda: next(clock))
    engine = CheatingEngine(_config())
    pose = {"head": {"direction": "left", "yaw": 40}, "hands": {}}
    assert engine.evaluate(STUDENT_A, pose, [], camera_id=0) == []  # t=100.0 starts the turn
    alerts = engine.evaluate(STUDENT_A, pose, [], camera_id=0)  # t=102.5, 2.5s later
    assert [a["alert_type"] for a in alerts] == ["suspicious_head_turn"]


def test_verifier_requires_detections_close_in_time(monkeypatch):
    import src.false_positive_filter as fpf

    clock = iter([0.0, 5.0, 5.1])
    monkeypatch.setattr(fpf.time, "monotonic", lambda: next(clock))
    verifier = MultiFrameVerifier(min_consecutive_frames=2, max_gap_seconds=1.0)
    phone = _det("cell_phone", [100, 100, 120, 130])
    assert verifier.update(phone) is False  # first sighting
    assert verifier.update(phone) is False  # 5s later: not consecutive
    assert verifier.update(phone) is True  # 0.1s later: confirmed
