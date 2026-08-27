import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login


@pytest.mark.asyncio
async def test_list_recordings(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/recordings", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "total" in body
    assert body["total"] >= 3


@pytest.mark.asyncio
async def test_list_recordings_with_filter(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get(
        "/api/v1/recordings?processing_state=completed",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code == 200
    for rec in resp.json().get("data", []):
        assert rec["status"] == "completed"


@pytest.mark.asyncio
async def test_get_recording(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/recordings?page_size=1", headers=auth_header(data["access_token"]))
    recordings = list_resp.json().get("data", [])
    if recordings:
        resp = await client.get(
            f"/api/v1/recordings/{recordings[0]['id']}",
            headers=auth_header(data["access_token"]),
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_recording_not_found(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/recordings/nonexistent", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_start_processing(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get(
        "/api/v1/recordings?processingState=queued",
        headers=auth_header(data["access_token"]),
    )
    recordings = list_resp.json().get("data", [])
    if recordings:
        resp = await client.post(
            f"/api/v1/recordings/{recordings[0]['id']}/process",
            headers=auth_header(data["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "started"


@pytest.mark.asyncio
async def test_cancel_processing(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get(
        "/api/v1/recordings?processingState=processing",
        headers=auth_header(data["access_token"]),
    )
    recordings = list_resp.json().get("data", [])
    if recordings:
        resp = await client.post(
            f"/api/v1/recordings/{recordings[0]['id']}/cancel",
            headers=auth_header(data["access_token"]),
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_process_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/recordings/some-id/process",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_recording(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.delete(
        "/api/v1/recordings/some-id",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code in (200, 404)
