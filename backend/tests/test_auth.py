import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login

CREDS = {
    "super_admin": ("admin@classguard.dev", "Admin@12345"),
    "admin": ("admin.admin@classguard.dev", "Admin@12345"),
    "faculty": ("faculty@classguard.dev", "Faculty@12345"),
    "security": ("security@classguard.dev", "Security@12345"),
    "viewer": ("viewer@classguard.dev", "Viewer@12345"),
}


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    assert "access_token" in data
    assert data["user"]["email"] == "admin@classguard.dev"
    assert data["user"]["role"] == "super_admin"


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@classguard.dev", "password": "WrongPassword"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_email(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@classguard.dev", "password": "Test@12345"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_endpoint(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/auth/me", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["email"] == "viewer@classguard.dev"


@pytest.mark.asyncio
async def test_me_no_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_me_invalid_token(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me", headers=auth_header("bad-token"))
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


@pytest.mark.asyncio
async def test_api_status(client: AsyncClient):
    resp = await client.get("/api/v1/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "online"
    assert data["database"] == "connected"


@pytest.mark.asyncio
async def test_forgot_password_does_not_reveal_accounts(client: AsyncClient):
    known = await client.post("/api/v1/auth/forgot-password", json={"email": "viewer@classguard.dev"})
    unknown = await client.post("/api/v1/auth/forgot-password", json={"email": "nobody@classguard.dev"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()


@pytest.mark.asyncio
async def test_reset_password_rejects_invalid_token(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "Whatever-Pass-1"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_ai_status_reports_engines(client: AsyncClient):
    resp = await client.get("/api/v1/status")
    assert resp.status_code == 200
    assert resp.json()["ai"] in ("online", "offline")


@pytest.mark.asyncio
async def test_report_summary_shape(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.get(
        "/api/v1/reports/generate",
        headers=auth_header(data["access_token"]),
        params={"start_date": "2020-01-01", "end_date": "2100-01-01"},
    )
    assert resp.status_code == 200
    body = resp.json()
    for key in ("totalEvents", "phoneDetections", "totalAlerts", "byDay", "byClassroom", "camerasOnline"):
        assert key in body
    assert body["totalEvents"] == sum(row["events"] for row in body["byClassroom"])
