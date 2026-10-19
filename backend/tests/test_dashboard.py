import pytest
from httpx import AsyncClient

from tests.conftest import auth_header, login

STAT_KEYS = {"total_cameras", "active_cameras", "total_classrooms", "active_alerts", "total_alerts_today"}


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient):
    data = await login(client, "viewer@classguard.dev", "Viewer@12345")
    headers = auth_header(data["access_token"])
    resp = await client.get("/api/v1/dashboard/stats", headers=headers)
    assert resp.status_code == 200
    stats = resp.json()
    assert set(stats) == STAT_KEYS
    assert all(isinstance(v, int) and v >= 0 for v in stats.values())
    assert stats["active_cameras"] <= stats["total_cameras"]
    assert stats["total_cameras"] >= 1
    assert stats["total_classrooms"] >= 1

    counts = (await client.get("/api/v1/alerts/count", headers=headers)).json()
    assert stats["active_alerts"] == counts["active"]


@pytest.mark.asyncio
async def test_dashboard_stats_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/dashboard/stats")
    assert resp.status_code in (401, 403)
