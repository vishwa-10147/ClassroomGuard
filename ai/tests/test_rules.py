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
        "phone_usage": {"enabled": True, "alert_after_seconds": 0, "proximity_to_person": 50},
        "calculator_usage": {"enabled": True, "alert_after_seconds": 0, "proximity_to_person": 50},
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
    assert alerts[0]["object_bbox"] == PHONE_NEAR_B["bbox"]


def test_phone_far_away_does_not_flag_student():
    engine = CheatingEngine(_config())
    assert engine.evaluate(STUDENT_A, None, [PHONE_NEAR_B], camera_id=0) == []


def test_calculator_only_flags_the_student_near_it():
    engine = CheatingEngine(_config())
    calc = _det("calculator", [1040, 100, 1080, 140])
    assert engine.evaluate(STUDENT_A, None, [calc], camera_id=0) == []
    alerts = engine.evaluate(STUDENT_B, None, [calc], camera_id=0)
    assert [a["alert_type"] for a in alerts] == ["calculator_usage"]


def test_calculator_ignored_when_exam_allows_it():
    engine = CheatingEngine(_config(calculator_usage={"enabled": True, "allowed": True, "alert_after_seconds": 0}))
    calc = _det("calculator", [1040, 100, 1080, 140])
    assert engine.evaluate(STUDENT_B, None, [calc], camera_id=0) == []


def _pose_with_wrist(wrist: tuple[float, float]) -> dict:
    kpts = [[0.0, 0.0]] * 17
    kpts = [list(p) for p in kpts]
    kpts[5], kpts[6] = [1020.0, 40.0], [1080.0, 40.0]  # shoulders
    kpts[9] = list(wrist)
    conf = [0.0] * 17
    conf[5] = conf[6] = conf[9] = 0.9
    return {"keypoints": kpts, "keypoint_conf": conf, "head": {"direction": "forward"}, "hands": {}}


def test_phone_in_hand_is_high_and_on_desk_is_medium():
    engine = CheatingEngine(_config())
    in_hand = engine.evaluate(STUDENT_B, _pose_with_wrist((1060, 115)), [PHONE_NEAR_B], camera_id=0)
    assert in_hand[0]["severity"] == "HIGH" and in_hand[0]["in_hand"] is True
    engine = CheatingEngine(_config())
    on_desk = engine.evaluate(STUDENT_B, _pose_with_wrist((1000, 190)), [PHONE_NEAR_B], camera_id=0)
    assert on_desk[0]["severity"] == "MEDIUM" and on_desk[0]["in_hand"] is False


def test_phone_must_persist_before_alert(monkeypatch):
    import src.cheating_logic as logic

    clock = iter([10.0, 10.5, 11.2, 11.2])
    monkeypatch.setattr(logic.time, "time", lambda: next(clock))
    engine = CheatingEngine(_config(phone_usage={"enabled": True, "alert_after_seconds": 1.0, "proximity_to_person": 50}))
    assert engine.evaluate(STUDENT_B, None, [PHONE_NEAR_B], camera_id=0) == []  # t=10.0 starts
    assert engine.evaluate(STUDENT_B, None, [PHONE_NEAR_B], camera_id=0) == []  # t=10.5
    alerts = engine.evaluate(STUDENT_B, None, [PHONE_NEAR_B], camera_id=0)  # t=11.2
    assert [a["alert_type"] for a in alerts] == ["phone_usage"]


def test_each_object_goes_to_the_nearest_student_only():
    neighbour = Track(track_id=3, bbox=[1080, 0, 1180, 200])
    assigned = CheatingEngine.assign_objects(
        [STUDENT_B, neighbour], {2: _pose_with_wrist((1060, 115)), 3: None}, [PHONE_NEAR_B]
    )
    assert assigned == {2: [PHONE_NEAR_B], 3: []}


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


def test_same_desk_phone_is_not_re_alerted_under_a_new_track_id():
    from src.false_positive_filter import FalsePositiveFilter

    fp = FalsePositiveFilter({"alerts": {"cooldown": 30, "object_cooldown": 120}})
    desk_phone = [1000, 500, 1030, 520]
    assert fp.should_alert(7, "phone_usage", desk_phone) is True
    # same phone, student re-identified as track 42 a few pixels away
    assert fp.should_alert(42, "phone_usage", [1010, 505, 1040, 525]) is False
    # a phone at another desk still alerts
    assert fp.should_alert(43, "phone_usage", [300, 200, 330, 220]) is True
