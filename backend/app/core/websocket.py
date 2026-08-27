from __future__ import annotations

import asyncio
import json
import logging
from typing import Optional

from fastapi import WebSocket

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL = "alerts"


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._redis_subscriber_task: Optional[asyncio.Task] = None
        self._redis_pub = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self._ensure_redis_listener()

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Try Redis pub/sub first for horizontal scaling
        pub = await self._get_redis_pub()
        if pub is not None:
            try:
                await pub.publish(CHANNEL, json.dumps(message))
                return
            except Exception:
                logger.debug("Redis PUBLISH failed, falling back to direct broadcast", exc_info=True)

        # Fallback: direct in-process broadcast
        await self._direct_broadcast(message)

    async def _direct_broadcast(self, message: dict):
        dead = []
        for conn in self.active_connections:
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
                    data = json.loads(raw["data"])
                except (json.JSONDecodeError, TypeError):
                    continue
                await self._direct_broadcast(data)
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
