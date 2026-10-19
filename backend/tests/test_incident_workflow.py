import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login


async def _security(client: AsyncClient) -> dict:
    data = await login(client, "security@classguard.dev", "Security@12345")
    return auth_header(data["access_token"])


@pytest.mark.asyncio
async def test_add_note_records_author_from_session(client: AsyncClient):
    headers = await _security(client)
    inc = (await client.post("/api/v1/incidents", headers=headers, json={"title": "Note test", "description": "x"})).json()
    resp = await client.post(
        f"/api/v1/incidents/{inc['id']}/notes", headers=headers,
        json={"text": "  Spoke to the student  ", "author": "Somebody else"},
    )
    assert resp.status_code == 200
    notes = resp.json()["notes"]
    assert len(notes) == 1
    assert notes[0]["text"] == "Spoke to the student"
    assert notes[0]["author"] != "Somebody else"
    assert notes[0]["timestamp"]

    second = await client.post(f"/api/v1/incidents/{inc['id']}/notes", headers=headers, json={"text": "Second"})
    assert [n["text"] for n in second.json()["notes"]] == ["Spoke to the student", "Second"]


@pytest.mark.asyncio
async def test_empty_note_rejected(client: AsyncClient):
    headers = await _security(client)
    inc = (await client.post("/api/v1/incidents", headers=headers, json={"title": "Empty note", "description": "x"})).json()
    resp = await client.post(f"/api/v1/incidents/{inc['id']}/notes", headers=headers, json={"text": ""})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_viewer_cannot_add_note(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    resp = await client.post(
        "/api/v1/incidents/inc-001/notes", headers=auth_header(data["access_token"]), json={"text": "x"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_notes_cannot_be_overwritten_with_patch(client: AsyncClient):
    headers = await _security(client)
    inc = (await client.post("/api/v1/incidents", headers=headers, json={"title": "Patch notes", "description": "x"})).json()
    await client.post(f"/api/v1/incidents/{inc['id']}/notes", headers=headers, json={"text": "Real note"})
    resp = await client.patch(f"/api/v1/incidents/{inc['id']}", headers=headers, json={"notes": []})
    assert resp.status_code == 200
    assert len(resp.json()["notes"]) == 1


@pytest.mark.asyncio
async def test_invalid_status_rejected(client: AsyncClient):
    headers = await _security(client)
    inc = (await client.post("/api/v1/incidents", headers=headers, json={"title": "Bad status", "description": "x"})).json()
    resp = await client.patch(f"/api/v1/incidents/{inc['id']}", headers=headers, json={"status": "closed-ish"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_reassign_and_reopen(client: AsyncClient):
    headers = await _security(client)
    me = (await client.get("/api/v1/auth/me", headers=headers)).json()
    inc = (await client.post("/api/v1/incidents", headers=headers, json={"title": "Assign", "description": "x"})).json()

    resp = await client.patch(f"/api/v1/incidents/{inc['id']}", headers=headers, json={"assignedTo": me["id"]})
    assert resp.status_code == 200
    assert resp.json()["assignedTo"] == me["id"]
    assert resp.json()["assigneeName"]

    resolved = await client.patch(f"/api/v1/incidents/{inc['id']}", headers=headers, json={"status": "resolved"})
    assert resolved.json()["resolvedAt"] is not None
    reopened = await client.patch(f"/api/v1/incidents/{inc['id']}", headers=headers, json={"status": "open"})
    assert reopened.json()["resolvedAt"] is None


@pytest.mark.asyncio
async def test_assignee_must_exist(client: AsyncClient):
    headers = await _security(client)
    inc = (await client.post("/api/v1/incidents", headers=headers, json={"title": "Ghost", "description": "x"})).json()
    resp = await client.patch(f"/api/v1/incidents/{inc['id']}", headers=headers, json={"assignedTo": "no-such-user"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_incident_from_alert_copies_context(client: AsyncClient):
    headers = await _security(client)
    alerts = (await client.get("/api/v1/alerts", headers=headers)).json()
    alert = next(a for a in alerts if a.get("cameraId"))
    resp = await client.post("/api/v1/incidents", headers=headers, json={
        "title": f"Escalated: {alert['title']}", "description": "From alert", "severity": "high",
        "alertId": alert["id"],
    })
    assert resp.status_code == 200
    body = resp.json()
    assert body["cameraId"] == alert["cameraId"]
    assert body["classroomId"] == alert["classroomId"]
    if alert.get("eventId"):
        assert alert["eventId"] in body["eventIds"]


@pytest.mark.asyncio
async def test_unknown_alert_rejected(client: AsyncClient):
    headers = await _security(client)
    resp = await client.post("/api/v1/incidents", headers=headers, json={
        "title": "x", "description": "y", "alertId": "no-such-alert",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_search_incidents(client: AsyncClient):
    headers = await _security(client)
    await client.post("/api/v1/incidents", headers=headers, json={"title": "Zebra crossing", "description": "x"})
    resp = await client.get("/api/v1/incidents?q=zebra", headers=headers)
    assert resp.status_code == 200
    titles = [i["title"] for i in resp.json()["data"]]
    assert titles and all("zebra" in t.lower() for t in titles)


@pytest.mark.asyncio
async def test_incidents_of_another_organisation_are_invisible(client: AsyncClient):
    headers = await _security(client)
    listing = (await client.get("/api/v1/incidents?page_size=200", headers=headers)).json()
    assert "inc-other-001" not in {i["id"] for i in listing["data"]}
    assert (await client.get("/api/v1/incidents/inc-other-001", headers=headers)).status_code == 404
    assert (await client.patch(
        "/api/v1/incidents/inc-other-001", headers=headers, json={"status": "resolved"}
    )).status_code == 404
    assert (await client.post(
        "/api/v1/incidents/inc-other-001/notes", headers=headers, json={"text": "x"}
    )).status_code == 404
    admin = await login(client, "admin@classguard.dev", "Admin@12345")
    assert (await client.delete(
        "/api/v1/incidents/inc-other-001", headers=auth_header(admin["access_token"])
    )).status_code == 404


@pytest.mark.asyncio
async def test_assignees_list_staff_without_user_admin_rights(client: AsyncClient):
    headers = await _security(client)
    resp = await client.get("/api/v1/incidents/assignees", headers=headers)
    assert resp.status_code == 200
    people = resp.json()
    assert people and all(set(p) == {"id", "name", "role"} for p in people)
    assert "viewer" not in {p["role"] for p in people}
    viewer = await login(client, "viewer@classguard.dev", "Viewer@12345")
    assert (await client.get(
        "/api/v1/incidents/assignees", headers=auth_header(viewer["access_token"])
    )).status_code == 403
