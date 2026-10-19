import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login


@pytest.mark.asyncio
async def test_list_cameras(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/cameras", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    assert len(resp.json()) >= 6


@pytest.mark.asyncio
async def test_create_camera(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    cid = list_resp.json()[0]["id"]
    resp = await client.post(
        "/api/v1/cameras",
        headers=auth_header(data["access_token"]),
        json={"name": "Test Cam", "cameraId": f"CAM-CRUD-{uuid.uuid4().hex[:8]}", "classroomId": cid, "fps": 30, "resolution": "1920x1080"},
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Test Cam"


@pytest.mark.asyncio
async def test_create_camera_duplicate_camera_id(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_cls = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    cid = list_cls.json()[0]["id"]
    dup_id = f"CAM-DUP-{uuid.uuid4().hex[:8]}"
    await client.post(
        "/api/v1/cameras",
        headers=auth_header(data["access_token"]),
        json={"name": "Cam1", "cameraId": dup_id, "classroomId": cid},
    )
    resp = await client.post(
        "/api/v1/cameras",
        headers=auth_header(data["access_token"]),
        json={"name": "Cam2", "cameraId": dup_id, "classroomId": cid},
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_create_camera_nonexistent_classroom(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.post(
        "/api/v1/cameras",
        headers=auth_header(data["access_token"]),
        json={"name": "Cam", "cameraId": "CAM-NOCLS", "classroomId": "nonexistent"},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_create_camera_forbidden_for_viewer(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/cameras",
        headers=auth_header(data["access_token"]),
        json={"name": "Cam", "cameraId": "CAM-FAIL", "classroomId": "x"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_get_camera(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    list_resp = await client.get("/api/v1/cameras", headers=auth_header(data["access_token"]))
    cam_id = list_resp.json()[0]["id"]
    resp = await client.get(f"/api/v1/cameras/{cam_id}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_camera_not_found(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.get("/api/v1/cameras/nonexistent", headers=auth_header(data["access_token"]))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_camera(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/cameras", headers=auth_header(data["access_token"]))
    cam_id = list_resp.json()[0]["id"]
    resp = await client.patch(
        f"/api/v1/cameras/{cam_id}",
        headers=auth_header(data["access_token"]),
        json={"name": "Updated Cam"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Cam"


@pytest.mark.asyncio
async def test_test_camera_connection(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_resp = await client.get("/api/v1/cameras", headers=auth_header(data["access_token"]))
    cam_id = list_resp.json()[0]["id"]
    resp = await client.post(f"/api/v1/cameras/{cam_id}/test", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200
    assert "success" in resp.json()


@pytest.mark.asyncio
async def test_delete_camera(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    list_cls = await client.get("/api/v1/classrooms", headers=auth_header(data["access_token"]))
    cid = list_cls.json()[0]["id"]
    create_resp = await client.post(
        "/api/v1/cameras",
        headers=auth_header(data["access_token"]),
        json={"name": "To Delete", "cameraId": "CAM-DEL-CHECK", "classroomId": cid},
    )
    cam_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/v1/cameras/{cam_id}", headers=auth_header(data["access_token"]))
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_camera_forbidden_for_admin(client: AsyncClient):
    data = await login(client, "admin.admin@classguard.dev", "Admin@12345")
    resp = await client.delete("/api/v1/cameras/some-id", headers=auth_header(data["access_token"]))
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_camera_zones_round_trip(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    headers = auth_header(data["access_token"])
    zones = [
        {"id": "z1", "type": "seat", "label": "A1", "x": 0.1, "y": 0.2, "w": 0.1, "h": 0.15},
        {"id": "z2", "type": "ignore", "label": "Invigilator desk", "x": 0.0, "y": 0.0, "w": 0.3, "h": 0.1},
    ]
    resp = await client.patch("/api/v1/cameras/cam-002", headers=headers, json={"zones": zones})
    assert resp.status_code == 200, resp.text
    assert [z["label"] for z in resp.json()["zones"]] == ["A1", "Invigilator desk"]
    assert (await client.get("/api/v1/cameras/cam-002", headers=headers)).json()["zones"][0]["x"] == 0.1


@pytest.mark.asyncio
@pytest.mark.parametrize("zone", [
    {"id": "z", "type": "seat", "label": "A1", "x": 0.9, "y": 0.0, "w": 0.2, "h": 0.1},  # off the image
    {"id": "z", "type": "seat", "label": "", "x": 0.1, "y": 0.1, "w": 0.1, "h": 0.1},  # seat without label
    {"id": "z", "type": "desk", "label": "A1", "x": 0.1, "y": 0.1, "w": 0.1, "h": 0.1},  # unknown type
])
async def test_invalid_zone_rejected(client: AsyncClient, zone):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    resp = await client.patch(
        "/api/v1/cameras/cam-002", headers=auth_header(data["access_token"]), json={"zones": [zone]}
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_duplicate_seat_labels_rejected(client: AsyncClient):
    data = await login(client, "admin@classguard.dev", "Admin@12345")
    seat = {"type": "seat", "label": "B2", "x": 0.1, "y": 0.1, "w": 0.1, "h": 0.1}
    resp = await client.patch(
        "/api/v1/cameras/cam-002", headers=auth_header(data["access_token"]),
        json={"zones": [{**seat, "id": "a"}, {**seat, "id": "b", "label": "b2"}]},
    )
    assert resp.status_code == 422
