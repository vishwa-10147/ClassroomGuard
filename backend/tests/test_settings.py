import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login


@pytest.mark.asyncio
async def test_get_settings(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.get("/api/v1/settings", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    keys = {s["key"] for group in resp.json() for s in group["settings"]}
    assert "data_retention_days" in keys


@pytest.mark.asyncio
async def test_update_settings(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    headers = auth_header(data["access_token"])
    resp = await client.put(
        "/api/v1/settings",
        headers=headers,
        json={"settings": [{"key": "data_retention_days", "value": 45}]},
    )
    assert resp.status_code == 200
    groups = (await client.get("/api/v1/settings", headers=headers)).json()
    values = {s["key"]: s["value"] for group in groups for s in group["settings"]}
    assert values["data_retention_days"] == "45"


@pytest.mark.asyncio
async def test_update_settings_forbidden_for_admin(client: AsyncClient):
    data = await login(client, "admin.admin@classguard.dev", "Admin@12345")
    resp = await client.put(
        "/api/v1/settings",
        headers=auth_header(data["access_token"]),
        json={"settings": [{"key": "data_retention_days", "value": 1}]},
    )
    assert resp.status_code == 403
