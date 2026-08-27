import pytest
from httpx import AsyncClient

from tests.conftest import login, auth_header


@pytest.mark.asyncio
async def test_viewer_cannot_create_classroom(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/classrooms",
        headers=auth_header(data["access_token"]),
        json={"name": "X", "building": "Y", "floor": 1, "roomNumber": "1", "totalSeats": 10},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_faculty_cannot_delete_user(client: AsyncClient):
    data = await login(client, "faculty@classguard.dev", "Faculty@12345")
    resp = await client.delete("/api/v1/users/some-id", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_security_cannot_create_user(client: AsyncClient):
    data = await login(client, "security@classguard.dev", "Security@12345")
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(data["access_token"]),
        json={"name": "X", "email": "x@rbac-test.com", "password": "Test@12345", "role": "faculty"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_admin_cannot_delete_camera(client: AsyncClient):
    data = await login(client, "admin.admin@classguard.dev", "Admin@12345")
    resp = await client.delete("/api/v1/cameras/some-id", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_viewer_cannot_acknowledge_alert(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post("/api/v1/alerts/some-id/acknowledge", headers=auth_header(data["access_token"]), json={})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_access_denied(client: AsyncClient):
    endpoints = [
        "/api/v1/classrooms",
        "/api/v1/cameras",
        "/api/v1/alerts",
        "/api/v1/events",
        "/api/v1/incidents",
        "/api/v1/recordings",
        "/api/v1/auth/me",
    ]
    for path in endpoints:
        resp = await client.get(path)
        assert resp.status_code in (401, 403), f"GET {path} should require auth, got {resp.status_code}"


@pytest.mark.asyncio
@pytest.mark.parametrize("role,creds", [
    ("super_admin", ("admin@classguard.dev", "Admin@12345")),
    ("admin", ("admin.admin@classguard.dev", "Admin@12345")),
    ("faculty", ("faculty@classguard.dev", "Faculty@12345")),
    ("security", ("security@classguard.dev", "Security@12345")),
    ("viewer", ("viewer@classguard.dev", "Viewer@12345")),
])
async def test_all_roles_can_list_classrooms(client: AsyncClient, role, creds):
    data = await login(client, creds[0], creds[1])
    resp = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200, f"Role {role} should list classrooms"


@pytest.mark.asyncio
@pytest.mark.parametrize("role,creds", [
    ("super_admin", ("admin@classguard.dev", "Admin@12345")),
    ("admin", ("admin.admin@classguard.dev", "Admin@12345")),
    ("faculty", ("faculty@classguard.dev", "Faculty@12345")),
    ("security", ("security@classguard.dev", "Security@12345")),
    ("viewer", ("viewer@classguard.dev", "Viewer@12345")),
])
async def test_all_roles_can_list_alerts(client: AsyncClient, role, creds):
    data = await login(client, creds[0], creds[1])
    resp = await client.get("/api/v1/alerts", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200, f"Role {role} should list alerts"


@pytest.mark.asyncio
@pytest.mark.parametrize("role,creds", [
    ("super_admin", ("admin@classguard.dev", "Admin@12345")),
    ("admin", ("admin.admin@classguard.dev", "Admin@12345")),
])
async def test_only_admins_can_manage_users(client: AsyncClient, role, creds):
    data = await login(client, creds[0], creds[1])
    resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("role,creds", [
    ("faculty", ("faculty@classguard.dev", "Faculty@12345")),
    ("security", ("security@classguard.dev", "Security@12345")),
    ("viewer", ("viewer@classguard.dev", "Viewer@12345")),
])
async def test_non_admins_cannot_manage_users(client: AsyncClient, role, creds):
    data = await login(client, creds[0], creds[1])
    resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403
