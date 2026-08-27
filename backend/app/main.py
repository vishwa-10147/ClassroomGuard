from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import text
import json

from backend.app.core.config import settings
from backend.app.core.database import engine, init_db
from backend.app.core.rate_limit import limiter
from backend.app.core.security_headers import SecurityHeadersMiddleware
from backend.app.core.websocket import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
    except Exception as e:
        print(f"Warning: Could not create tables: {e}")
    yield


app = FastAPI(
    title="ClassroomGuard API",
    description="AI-powered classroom monitoring and security platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter

app.add_middleware(SecurityHeadersMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    max_age=600,
)

from backend.app.api.auth import router as auth_router
from backend.app.api.users import router as users_router
from backend.app.api.classrooms import router as classrooms_router
from backend.app.api.cameras import router as cameras_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.events import router as events_router
from backend.app.api.recordings import router as recordings_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.reports import router as reports_router
from backend.app.api.test_rbac import router as rbac_router
from backend.app.api.audit_logs import router as audit_logs_router
from backend.app.api.roles import router as roles_router
from backend.app.api.settings import router as settings_router
from backend.app.api.uploads import router as uploads_router
from backend.app.api.evidence import router as evidence_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.compliance import router as compliance_router
from backend.app.api.webhooks import router as webhooks_router
from backend.app.api.organizations import router as organizations_router

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(classrooms_router)
app.include_router(cameras_router)
app.include_router(alerts_router)
app.include_router(events_router)
app.include_router(recordings_router)
app.include_router(incidents_router)
app.include_router(reports_router)
app.include_router(rbac_router)
app.include_router(audit_logs_router)
app.include_router(roles_router)
app.include_router(settings_router)
app.include_router(uploads_router)
app.include_router(evidence_router)
app.include_router(notifications_router)
app.include_router(compliance_router)
app.include_router(webhooks_router)
app.include_router(organizations_router)


@app.get("/")
async def root():
    return {
        "name": "ClassroomGuard API",
        "version": "1.0.0",
        "status": "online",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "classroomguard-api",
    }


async def check_database() -> str:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return "connected"
    except Exception:
        return "disconnected"


@app.get("/api/v1/status")
async def api_status():
    database_status = await check_database()
    return {
        "status": "online",
        "ai": "not_connected",
        "database": database_status,
        "wsConnections": len(manager.active_connections),
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong", "timestamp": msg.get("timestamp")})
            elif msg.get("type") == "subscribe":
                await websocket.send_json({"type": "subscribed", "channel": msg.get("channel", "alerts")})
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


@app.post("/api/v1/ws/broadcast")
async def ws_broadcast(message: dict):
    """Internal endpoint — broadcast a message to all connected WebSocket clients."""
    await manager.broadcast(message)
    return {"delivered": len(manager.active_connections)}
