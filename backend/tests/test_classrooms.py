import pytest
from httpx import AsyncClient

from tests.conftest import login, auth_header


@pytest.mark.asyncio
async def test_list_classrooms(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 3


@pytest.mark.asyncio
async def test_create_classroom(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.post(
        "/api/v1/classrooms",
        headers=auth_header(data["access_token"]),
        json={
            "name": "Test Room CRUD",
            "building": "Science",
            "floor": 2,
            "roomNumber": "201",
            "totalSeats": 40,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Test Room CRUD"


@pytest.mark.asyncio
async def test_create_classroom_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/classrooms",
        headers=auth_header(data["access_token"]),
        json={"name": "X", "building": "Y", "floor": 1, "roomNumber": "001", "totalSeats": 30},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_create_classroom_forbidden_for_faculty(client: AsyncClient):
    data = await login(client, "faculty@classguard.dev", "Faculty@12345")
    resp = await client.post(
        "/api/v1/classrooms",
        headers=auth_header(data["access_token"]),
        json={"name": "X", "building": "Y", "floor": 1, "roomNumber": "001", "totalSeats": 30},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_classroom(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    cid = list_resp.json()[0]["id"]
    resp = await client.get(f"/api/v1/classrooms/{cid}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["id"] == cid


@pytest.mark.asyncio
async def test_get_classroom_not_found(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/classrooms/nonexistent", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_classroom(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    cid = list_resp.json()[0]["id"]
    resp = await client.patch(
        f"/api/v1/classrooms/{cid}",
        headers=auth_header(data["access_token"]),
        json={"name": "Updated Room Name"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Room Name"


@pytest.mark.asyncio
async def test_get_classroom_layout(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    cid = list_resp.json()[0]["id"]
    resp = await client.get(f"/api/v1/classrooms/{cid}/layout", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    layout = resp.json()
    assert "classroomId" in layout
    assert "rows" in layout
    assert len(layout["rows"]) > 0


@pytest.mark.asyncio
async def test_delete_classroom_as_super_admin(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    create_resp = await client.post(
        "/api/v1/classrooms",
        headers=auth_header(data["access_token"]),
        json={"name": "To Delete", "building": "Temp", "floor": 0, "roomNumber": "DEL", "totalSeats": 10},
    )
    cid = create_resp.json()["id"]
    resp = await client.delete(f"/api/v1/classrooms/{cid}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_classroom_forbidden_for_admin(client: AsyncClient):
    data = await login(client, "admin.admin@classguard.dev", "Admin@12345")
    resp = await client.delete("/api/v1/classrooms/some-id", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403
