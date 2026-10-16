import os
import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login


@pytest.mark.asyncio
async def test_self_registration_disabled_by_default(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": f"signup-{uuid.uuid4().hex[:8]}@example.com",
            "password": "Signup@12345",
            "name": "Sign Up",
            "organization_name": "Some Org",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_two_factor_stub_removed(client: AsyncClient):
    resp = await client.post("/api/v1/auth/verify-2fa", json={"code": "123456"})
    assert resp.status_code in (404, 405)


@pytest.mark.asyncio
async def test_push_token_registration_requires_sign_in(client: AsyncClient):
    body = {"token": f"ExponentPushToken[{uuid.uuid4().hex}]", "platform": "android"}
    resp = await client.post("/api/v1/notifications/register", json=body)
    assert resp.status_code == 401

    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/notifications/register", json=body, headers=auth_header(data["access_token"])
    )
    assert resp.status_code == 201


SERVICE_TOKEN = os.environ.get("TEST_AI_SERVICE_TOKEN", "")


@pytest.mark.asyncio
@pytest.mark.skipif(not SERVICE_TOKEN, reason="TEST_AI_SERVICE_TOKEN not set")
async def test_ai_service_can_read_a_camera(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    cameras = (await client.get("/api/v1/cameras", headers=auth_header(data["access_token"]))).json()
    items = cameras["items"] if isinstance(cameras, dict) else cameras
    assert items, "seed data should include cameras"
    resp = await client.get(f"/api/v1/cameras/{items[0]['id']}", headers={"X-Service-Token": SERVICE_TOKEN})
    assert resp.status_code == 200
    resp = await client.get(f"/api/v1/cameras/{items[0]['id']}", headers={"X-Service-Token": "wrong"})
    assert resp.status_code == 401
