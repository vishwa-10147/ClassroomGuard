import pytest
from httpx import AsyncClient
from tests.conftest import auth_header, login

@pytest.mark.asyncio
async def test_list_audit_logs(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.get("/api/v1/audit-logs", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

@pytest.mark.asyncio
async def test_list_audit_logs_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/audit-logs", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403
