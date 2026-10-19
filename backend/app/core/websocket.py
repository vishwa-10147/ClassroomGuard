from __future__ import annotations

import asyncio
import json
import logging

from backend.app.core.config import settings
from fastapi import WebSocket

logger = logging.getLogger(__name__)

CHANNEL = "alerts"


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._redis_subscriber_task: asyncio.Task | None = None
        self._redis_pub = None

    async def connect(self, websocket: WebSocket, organization_id: str):
        await websocket.accept()
        websocket.state.organization_id = organization_id
        self.active_connections.append(websocket)
        await self._ensure_redis_listener()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict, organization_id: str | None = None):
        envelope = {"organization_id": organization_id, "message": message}
        # Try Redis pub/sub first for horizontal scaling
        pub = await self._get_redis_pub()
        if pub is not None:
            try:
                await pub.publish(CHANNEL, json.dumps(envelope))
                return
            except Exception:
                logger.debug("Redis PUBLISH failed, falling back to direct broadcast", exc_info=True)

        # Fallback: direct in-process broadcast
        await self._direct_broadcast(message, organization_id)

    async def _direct_broadcast(self, message: dict, organization_id: str | None = None):
        dead = []
        for conn in self.active_connections:
            if organization_id and getattr(getattr(conn, "state", None), "organization_id", None) != organization_id:
                continue
            try:
                await conn.send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.active_connections.remove(d)

    async def _get_redis_pub(self):
        if not settings.use_redis:
            return None
        if self._redis_pub is None:
            try:
                from backend.app.core.redis import get_redis
                client = get_redis()
                if client is not None:
                    self._redis_pub = client
            except Exception:
                pass
        return self._redis_pub

    async def _ensure_redis_listener(self):
        """Start a background task that subscribes to the Redis alerts channel."""
        if not settings.use_redis:
            return
        if self._redis_subscriber_task is not None and not self._redis_subscriber_task.done():
            return
        try:
            from backend.app.core.redis import get_redis
            client = get_redis()
            if client is None:
                return
            self._redis_subscriber_task = asyncio.create_task(self._redis_subscribe(client))
        except Exception:
            logger.debug("Could not start Redis subscriber", exc_info=True)

    async def _redis_subscribe(self, client):
        pubsub = client.pubsub()
        try:
            await pubsub.subscribe(CHANNEL)
            async for raw in pubsub.listen():
                if raw is None:
                    continue
                if raw.get("type") != "message":
                    continue
                try:
                    envelope = json.loads(raw["data"])
                except (json.JSONDecodeError, TypeError):
                    continue
                if not isinstance(envelope, dict):
                    continue
                await self._direct_broadcast(
                    envelope.get("message", {}),
                    envelope.get("organization_id"),
                )
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.debug("Redis subscriber stopped", exc_info=True)
        finally:
            try:
                await pubsub.unsubscribe(CHANNEL)
                await pubsub.aclose()
            except Exception:
                pass


manager = ConnectionManager()
