import asyncio
from uuid import uuid4

import pytest
import pytest_asyncio
import httpx

from backend.app.core.security import create_access_token, hash_password


BASE_URL = "http://localhost:8000"


@pytest_asyncio.fixture
async def client():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as c:
        yield c


async def login(client: httpx.AsyncClient, email: str, password: str) -> dict:
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, f"Login failed for {email}: {resp.text}"
    return resp.json()


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}
