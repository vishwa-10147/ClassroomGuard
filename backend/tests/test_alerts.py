import pytest
from httpx import AsyncClient

from tests.conftest import login, auth_header


@pytest.mark.asyncio
async def test_list_alerts(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/alerts", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 3


@pytest.mark.asyncio
async def test_list_alerts_with_filter(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/alerts?severity=high", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    for alert in resp.json():
        assert alert["severity"] == "high"


@pytest.mark.asyncio
async def test_alert_count(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/alerts/count", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    counts = resp.json()
    assert "total" in counts
    assert "active" in counts
    assert counts["total"] >= 3


@pytest.mark.asyncio
async def test_get_alert(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/alerts", headers=auth_header(data["access_token"]))
    alert_id = list_resp.json()[0]["id"]
    resp = await client.get(f"/api/v1/alerts/{alert_id}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["id"] == alert_id


@pytest.mark.asyncio
async def test_get_alert_not_found(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/alerts/nonexistent", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_acknowledge_alert(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    list_resp = await client.get("/api/v1/alerts?status=active", headers=auth_header(data["access_token"]))
    active = [a for a in list_resp.json() if a["status"] == "active"]
    if active:
        resp = await client.post(
            f"/api/v1/alerts/{active[0]['id']}/acknowledge",
            headers=auth_header(data["access_token"]),
            json={},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "acknowledged"


@pytest.mark.asyncio
async def test_resolve_alert(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    list_resp = await client.get("/api/v1/alerts?status=active", headers=auth_header(data["access_token"]))
    active = [a for a in list_resp.json() if a["status"] == "active"]
    if active:
        resp = await client.post(
            f"/api/v1/alerts/{active[0]['id']}/resolve",
            headers=auth_header(data["access_token"]),
            json={},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "resolved"


@pytest.mark.asyncio
async def test_assign_alert(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    admin_id = data["user"]["id"]
    list_resp = await client.get("/api/v1/alerts", headers=auth_header(data["access_token"]))
    alerts = list_resp.json()
    if alerts:
        resp = await client.post(
            f"/api/v1/alerts/{alerts[0]['id']}/assign",
            headers=auth_header(data["access_token"]),
            json={"assignedTo": admin_id},
        )
        assert resp.status_code == 200


@pytest.mark.asyncio
async def test_assign_alert_forbidden_for_security(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    list_resp = await client.get("/api/v1/alerts", headers=auth_header(data["access_token"]))
    alerts = list_resp.json()
    if alerts:
        resp = await client.post(
            f"/api/v1/alerts/{alerts[0]['id']}/assign",
            headers=auth_header(data["access_token"]),
            json={"assignedTo": "x"},
        )
        assert resp.status_code == 403


@pytest.mark.asyncio
async def test_acknowledge_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/alerts", headers=auth_header(data["access_token"]))
    alerts = list_resp.json()
    if alerts:
        resp = await client.post(
            f"/api/v1/alerts/{alerts[0]['id']}/acknowledge",
            headers=auth_header(data["access_token"]),
            json={},
        )
        assert resp.status_code == 403
