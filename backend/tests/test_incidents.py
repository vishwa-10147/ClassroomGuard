import pytest
from httpx import AsyncClient

from tests.conftest import login, auth_header


@pytest.mark.asyncio
async def test_list_incidents(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/incidents", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "total" in body
    assert body["total"] >= 2


@pytest.mark.asyncio
async def test_create_incident(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    resp = await client.post(
        "/api/v1/incidents",
        headers=auth_header(data["access_token"]),
        json={"title": "Test Incident", "description": "Test desc", "severity": "medium"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Test Incident"
    assert resp.json()["status"] == "open"


@pytest.mark.asyncio
async def test_create_incident_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/incidents",
        headers=auth_header(data["access_token"]),
        json={"title": "X", "description": "Y"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_incident(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/incidents", headers=auth_header(data["access_token"]))
    incidents = list_resp.json().get("data", [])
    if incidents:
        resp = await client.get(f"/api/v1/incidents/{incidents[0]['id']}", headers=auth_header(data["access_token"]))
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_incident_not_found(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/incidents/nonexistent", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_incident(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    create_resp = await client.post(
        "/api/v1/incidents",
        headers=auth_header(data["access_token"]),
        json={"title": "To Update", "description": "Original"},
    )
    inc_id = create_resp.json()["id"]
    resp = await client.patch(
        f"/api/v1/incidents/{inc_id}",
        headers=auth_header(data["access_token"]),
        json={"status": "investigating"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "investigating"


@pytest.mark.asyncio
async def test_resolve_incident_sets_resolved_at(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    create_resp = await client.post(
        "/api/v1/incidents",
        headers=auth_header(data["access_token"]),
        json={"title": "Resolve Test", "description": "X"},
    )
    inc_id = create_resp.json()["id"]
    resp = await client.patch(
        f"/api/v1/incidents/{inc_id}",
        headers=auth_header(data["access_token"]),
        json={"status": "resolved"},
    )
    assert resp.status_code == 200
    assert resp.json()["resolvedAt"] is not None


@pytest.mark.asyncio
async def test_delete_incident(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    create_resp = await client.post(
        "/api/v1/incidents",
        headers=auth_header(data["access_token"]),
        json={"title": "To Delete", "description": "X"},
    )
    inc_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/v1/incidents/{inc_id}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_incident_forbidden_for_faculty(client: AsyncClient):
    data = await login(client, "faculty@classguard.dev", "Faculty@12345")
    resp = await client.delete("/api/v1/incidents/some-id", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_incidents_with_filter(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/incidents?status=open", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    for inc in resp.json().get("data", []):
        assert inc["status"] == "open"
