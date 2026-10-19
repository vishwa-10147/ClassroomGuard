import os

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login

SERVICE_TOKEN = os.environ.get("TEST_AI_SERVICE_TOKEN", "")
SERVICE = {"X-Service-Token": SERVICE_TOKEN}
VIDEO = b"\x00\x00\x00\x18ftypmp42" + b"\x00" * 2048


async def _admin(client: AsyncClient) -> dict:
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    return auth_header(data["access_token"])


async def _upload(client: AsyncClient, headers: dict, analyze: bool = True) -> dict:
    resp = await client.post(
        "/api/v1/recordings", headers=headers,
        files={"file": ("exam hall.mp4", VIDEO, "video/mp4")},
        data={"cameraId": "cam-001", "name": "Mid-term, hall A", "analyze": str(analyze).lower()},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def _claim(client: AsyncClient, recording_id: str) -> dict:
    """Claim jobs until ours comes up (other queued recordings may be ahead of it)."""
    for _ in range(50):
        resp = await client.post("/api/v1/recordings/claim", headers=SERVICE)
        assert resp.status_code in (200, 204)
        if resp.status_code == 204:
            break
        job = resp.json()
        if job["id"] == recording_id:
            return job
        await client.post(f"/api/v1/recordings/{job['id']}/complete", headers=SERVICE, json={"state": "completed"})
    raise AssertionError("uploaded recording was never handed out")


@pytest.mark.asyncio
async def test_upload_creates_queued_recording(client: AsyncClient):
    headers = await _admin(client)
    rec = await _upload(client, headers)
    assert rec["status"] == "queued"
    assert rec["name"] == "Mid-term, hall A"
    assert rec["cameraId"] == "cam-001"
    assert rec["classroomId"] == "cls-001"
    assert rec["fileSize"] == len(VIDEO)

    played = await client.get(f"/api/v1/recordings/{rec['id']}/file", headers={**headers, "Range": "bytes=0-9"})
    assert played.status_code == 206
    assert played.content == VIDEO[:10]
    downloaded = await client.get(f"/api/v1/recordings/{rec['id']}/file?download=true", headers=headers)
    assert downloaded.status_code == 200
    assert downloaded.content == VIDEO
    assert "attachment" in downloaded.headers["content-disposition"]


@pytest.mark.asyncio
async def test_upload_rejects_unknown_camera_and_bad_type(client: AsyncClient):
    headers = await _admin(client)
    resp = await client.post(
        "/api/v1/recordings", headers=headers,
        files={"file": ("a.mp4", VIDEO, "video/mp4")}, data={"cameraId": "no-such-camera"},
    )
    assert resp.status_code == 422
    resp = await client.post(
        "/api/v1/recordings", headers=headers,
        files={"file": ("a.exe", b"MZ", "application/octet-stream")}, data={"cameraId": "cam-001"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_faculty_cannot_upload(client: AsyncClient):
    data = await login(client, "faculty@classguard.dev", "Faculty@12345")
    resp = await client.post(
        "/api/v1/recordings", headers=auth_header(data["access_token"]),
        files={"file": ("a.mp4", VIDEO, "video/mp4")}, data={"cameraId": "cam-001"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_worker_endpoints_need_the_service_token(client: AsyncClient):
    headers = await _admin(client)
    assert (await client.post("/api/v1/recordings/claim", headers=headers)).status_code == 401
    assert (await client.post("/api/v1/recordings/claim", headers={"X-Service-Token": "wrong"})).status_code == 401
    assert (await client.get("/api/v1/recordings/rec-other-001/source", headers=headers)).status_code == 401


@pytest.mark.asyncio
@pytest.mark.skipif(not SERVICE_TOKEN, reason="TEST_AI_SERVICE_TOKEN not set")
async def test_full_analysis_cycle(client: AsyncClient):
    headers = await _admin(client)
    rec = await _upload(client, headers)
    job = await _claim(client, rec["id"])
    assert job["cameraCode"] == "CAM-FRONT-L"

    source = await client.get(f"/api/v1/recordings/{rec['id']}/source", headers=SERVICE)
    assert source.status_code == 200 and source.content == VIDEO

    progress = await client.post(f"/api/v1/recordings/{rec['id']}/progress", headers=SERVICE, json={
        "currentFrame": 50, "totalFrames": 200, "duration": 8.0, "phase": "analysing", "detectionCount": 3,
    })
    assert progress.json() == {"cancelled": False}
    mid = (await client.get(f"/api/v1/recordings/{rec['id']}", headers=headers)).json()
    assert mid["status"] == "processing" and mid["progress"] == 25 and mid["duration"] == 8.0

    alerts_before = len((await client.get("/api/v1/alerts?page_size=200", headers=headers)).json())
    event = await client.post("/api/v1/events", headers=SERVICE, json={
        "eventType": "PHONE_IN_HAND", "severity": "high", "cameraId": "CAM-FRONT-L",
        "recordingId": rec["id"], "seatId": "B4", "metadata": {"video_time_s": 4.2},
    })
    assert event.status_code == 201, event.text
    assert event.json()["recordingId"] == rec["id"]
    alerts_after = len((await client.get("/api/v1/alerts?page_size=200", headers=headers)).json())
    assert alerts_after == alerts_before, "footage analysis must not raise live alerts"

    done = await client.post(f"/api/v1/recordings/{rec['id']}/complete", headers=SERVICE, json={
        "state": "completed", "detectionCount": 4,
    })
    assert done.json() == {"status": "completed"}
    final = (await client.get(f"/api/v1/recordings/{rec['id']}", headers=headers)).json()
    assert final["status"] == "completed" and final["progress"] == 100
    assert final["eventCount"] == 1 and final["detectionCount"] == 4

    events = (await client.get(f"/api/v1/events?recording_id={rec['id']}", headers=headers)).json()
    assert [e["seatId"] for e in events["data"]] == ["B4"]
    live = (await client.get("/api/v1/events?source=live&page_size=200", headers=headers)).json()
    assert rec["id"] not in {e.get("recordingId") for e in live["data"]}

    # Re-running clears the previous run's state when it is claimed again
    assert (await client.post(f"/api/v1/recordings/{rec['id']}/process", headers=headers)).status_code == 200
    assert (await client.post(f"/api/v1/recordings/{rec['id']}/process", headers=headers)).status_code == 400


@pytest.mark.asyncio
@pytest.mark.skipif(not SERVICE_TOKEN, reason="TEST_AI_SERVICE_TOKEN not set")
async def test_cancel_stops_the_worker(client: AsyncClient):
    headers = await _admin(client)
    rec = await _upload(client, headers)
    await _claim(client, rec["id"])
    assert (await client.post(f"/api/v1/recordings/{rec['id']}/cancel", headers=headers)).status_code == 200
    progress = await client.post(f"/api/v1/recordings/{rec['id']}/progress", headers=SERVICE, json={"currentFrame": 1})
    assert progress.json() == {"cancelled": True}
    done = await client.post(f"/api/v1/recordings/{rec['id']}/complete", headers=SERVICE, json={"state": "completed"})
    assert done.json() == {"status": "cancelled"}


@pytest.mark.asyncio
async def test_upload_without_analysis(client: AsyncClient):
    headers = await _admin(client)
    rec = await _upload(client, headers, analyze=False)
    assert rec["status"] == "completed"


@pytest.mark.asyncio
async def test_delete_removes_the_file(client: AsyncClient):
    headers = await _admin(client)
    rec = await _upload(client, headers, analyze=False)
    assert (await client.delete(f"/api/v1/recordings/{rec['id']}", headers=headers)).status_code == 200
    assert (await client.get(f"/api/v1/uploads/video/{rec['filename']}", headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_recordings_of_another_organisation_are_invisible(client: AsyncClient):
    headers = await _admin(client)
    listing = (await client.get("/api/v1/recordings?page_size=200", headers=headers)).json()
    assert "rec-other-001" not in {r["id"] for r in listing["data"]}
    assert (await client.get("/api/v1/recordings/rec-other-001", headers=headers)).status_code == 404
    assert (await client.get("/api/v1/recordings/rec-other-001/file", headers=headers)).status_code == 404
    assert (await client.delete("/api/v1/recordings/rec-other-001", headers=headers)).status_code == 404
    assert (await client.get("/api/v1/uploads/video/other-college.mp4", headers=headers)).status_code == 404
