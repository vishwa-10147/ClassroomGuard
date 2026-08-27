import pytest
from httpx import AsyncClient

from tests.conftest import login, auth_header


@pytest.mark.asyncio
async def test_list_events(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/events", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "total" in body
    assert body["total"] >= 8


@pytest.mark.asyncio
async def test_list_events_with_filter(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/events?severity=critical", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    for ev in resp.json().get("data", []):
        assert ev["severity"] == "critical"


@pytest.mark.asyncio
async def test_recent_events(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/events/recent?limit=3", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) <= 3


@pytest.mark.asyncio
async def test_get_event(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/events?page_size=1", headers=auth_header(data["access_token"]))
    events = list_resp.json().get("data", [])
    if events:
        resp = await client.get(f"/api/v1/events/{events[0]['id']}", headers=auth_header(data["access_token"]))
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_event_not_found(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/events/nonexistent", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_events_response_fields(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/events?page_size=1", headers=auth_header(data["access_token"]))
    events = resp.json().get("data", [])
    if events:
        ev = events[0]
        assert "id" in ev
        assert "type" in ev
        assert "severity" in ev
        assert "timestamp" in ev
        assert "classroomId" in ev
        assert "cameraId" in ev
