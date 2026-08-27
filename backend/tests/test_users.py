import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login


@pytest.mark.asyncio
async def test_list_users_as_admin(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    users = resp.json()
    assert isinstance(users, list)
    assert len(users) >= 5


@pytest.mark.asyncio
async def test_list_users_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_users_forbidden_for_faculty(client: AsyncClient):
    data = await login(client, "faculty@classguard.dev", "Faculty@12345")
    resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_user_as_super_admin(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(data["access_token"]),
        json={
            "name": "New Test User",
            "email": f"new-user-{uuid.uuid4().hex[:8]}@classguard.dev",
            "password": "Test@12345",
            "role": "faculty",
        },
    )
    assert resp.status_code == 201
    created = resp.json()
    assert created["name"] == "New Test User"
    assert created["role"] == "faculty"
    assert "id" in created


@pytest.mark.asyncio
async def test_create_user_forbidden_for_admin(client: AsyncClient):
    data = await login(client, "admin.admin@classguard.dev", "Admin@12345")
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(data["access_token"]),
        json={
            "name": "Should Fail",
            "email": "should-fail-001@classguard.dev",
            "password": "Test@12345",
            "role": "faculty",
        },
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_user_duplicate_email(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.post(
        "/api/v1/users",
        headers=auth_header(data["access_token"]),
        json={
            "name": "Dup",
            "email": "admin@classguard.dev",
            "password": "Test@12345",
            "role": "faculty",
        },
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_user_by_id(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    user_id = list_resp.json()[0]["id"]
    resp = await client.get(f"/api/v1/users/{user_id}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["id"] == user_id


@pytest.mark.asyncio
async def test_get_user_not_found(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.get("/api/v1/users/nonexistent-id", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_user(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    user_id = list_resp.json()[0]["id"]
    resp = await client.patch(
        f"/api/v1/users/{user_id}",
        headers=auth_header(data["access_token"]),
        json={"name": "Updated Name"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_disable_user(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/users", headers=auth_header(data["access_token"]))
    faculty = [u for u in list_resp.json() if u["role"] == "faculty"]
    assert len(faculty) > 0
    resp = await client.post(
        f"/api/v1/users/{faculty[0]['id']}/disable",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "disabled"


@pytest.mark.asyncio
async def test_disable_self_forbidden(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    me = await client.get("/api/v1/auth/me", headers=auth_header(data["access_token"]))
    user_id = me.json()["id"]
    resp = await client.post(
        f"/api/v1/users/{user_id}/disable",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_user(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    create_resp = await client.post(
        "/api/v1/users",
        headers=auth_header(data["access_token"]),
        json={
            "name": "To Delete",
            "email": "to-delete-001@classguard.dev",
            "password": "Test@12345",
            "role": "viewer",
        },
    )
    user_id = create_resp.json()["id"]
    resp = await client.delete(
        f"/api/v1/users/{user_id}",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["message"] == "User deleted successfully"


@pytest.mark.asyncio
async def test_delete_self_forbidden(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    me = await client.get("/api/v1/auth/me", headers=auth_header(data["access_token"]))
    user_id = me.json()["id"]
    resp = await client.delete(
        f"/api/v1/users/{user_id}",
        headers=auth_header(data["access_token"]),
    )
    assert resp.status_code == 400
