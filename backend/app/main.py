import json
import logging
import time
from contextlib import asynccontextmanager
from datetime import UTC, datetime

from backend.app.core.config import settings
from backend.app.core.database import engine, init_db
from backend.app.core.rate_limit import limiter
from backend.app.core.security import decode_access_token
from backend.app.core.security_headers import SecurityHeadersMiddleware
from backend.app.core.websocket import manager
from backend.app.middleware.metrics import MetricsMiddleware
from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await init_db()
        # Stored system roles must grant what this release's code checks for
        from backend.app.api.roles import ensure_default_roles
        from backend.app.core.database import AsyncSessionLocal

        async with AsyncSessionLocal() as db:
            await ensure_default_roles(db)
    except Exception as e:
        logger.exception("Could not initialize the database")
        if _is_production:
            raise RuntimeError("Database initialization failed") from e
    yield
    if settings.enable_tracing:
        from backend.app.core.tracing import shutdown_tracing

        shutdown_tracing()


_is_production = settings.app_env == "production"

app = FastAPI(
    title="ClassroomGuard API",
    description="AI-powered classroom monitoring and security platform",
    version="1.0.0",
    lifespan=lifespan,
    # Interactive API docs are for development only
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)

app.state.limiter = limiter

# Optional observability: off unless SENTRY_DSN / ENABLE_TRACING are set
if settings.sentry_dsn:
    from backend.app.core.error_tracking import setup_sentry

    setup_sentry(dsn=settings.sentry_dsn, environment=settings.app_env)

if settings.enable_tracing:
    from backend.app.core.tracing import setup_tracing

    setup_tracing(app, service_name="classroomguard-api", otlp_endpoint=settings.otlp_endpoint)

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(MetricsMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Range", "X-Service-Token"],
    max_age=600,
)

from backend.app.api.alerts import router as alerts_router
from backend.app.api.audit_logs import router as audit_logs_router
from backend.app.api.auth import router as auth_router
from backend.app.api.cameras import router as cameras_router
from backend.app.api.classrooms import router as classrooms_router
from backend.app.api.compliance import router as compliance_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.dependencies import get_db, require_permission_or_service
from backend.app.api.events import router as events_router
from backend.app.api.evidence import router as evidence_router
from backend.app.api.health import router as health_router
from backend.app.api.incidents import router as incidents_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.organizations import router as organizations_router
from backend.app.api.recordings import router as recordings_router
from backend.app.api.reports import router as reports_router
from backend.app.api.roles import router as roles_router
from backend.app.api.search import router as search_router
from backend.app.api.settings import router as settings_router
from backend.app.api.uploads import router as uploads_router
from backend.app.api.users import router as users_router
from backend.app.api.webhooks import router as webhooks_router
from backend.app.models.camera import Camera
from backend.app.models.user import User
from prometheus_client import make_asgi_app

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(search_router)
app.include_router(classrooms_router)
app.include_router(cameras_router)
app.include_router(alerts_router)
app.include_router(dashboard_router)
app.include_router(events_router)
app.include_router(recordings_router)
app.include_router(incidents_router)
app.include_router(reports_router)
app.include_router(health_router)
app.include_router(audit_logs_router)
app.include_router(roles_router)
app.include_router(settings_router)
app.include_router(uploads_router)
app.include_router(evidence_router)
app.include_router(notifications_router)
app.include_router(compliance_router)
app.include_router(webhooks_router)
app.include_router(organizations_router)

# Mount Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)



@app.get("/")
async def root():
    return {
        "name": "ClassroomGuard API",
        "version": "1.0.0",
        "status": "online",
    }


async def check_database() -> str:
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        return "connected"
    except Exception:
        return "disconnected"


# Last heartbeat per AI engine (in memory: the API runs as a single worker)
_AI_HEARTBEATS: dict[str, dict] = {}
AI_OFFLINE_AFTER_S = 90


@app.post("/api/v1/ai/heartbeat", status_code=204)
async def ai_heartbeat(
    body: dict,
    _caller=Depends(require_permission_or_service("alerts:write")),
    db: AsyncSession = Depends(get_db),
):
    """Called by each AI engine every 30 s: engine liveness plus each camera's video status."""
    engine_name = str(body.get("engine") or "ai")[:100]
    _AI_HEARTBEATS[engine_name] = {
        "last_seen": time.time(),
        "cameras": int(body.get("cameras", 0)),
        "fps": round(float(body.get("fps", 0.0)), 1),
    }
    now = datetime.now(UTC)
    for cam in body.get("camera_status") or []:
        code = str(cam.get("id", ""))[:100]
        camera = (await db.execute(
            select(Camera).where(or_(Camera.id == code, Camera.camera_id == code))
        )).scalar_one_or_none()
        if camera is None:
            continue
        camera.status = "online" if cam.get("online") else "offline"
        camera.ai_processing = bool(cam.get("online"))
        camera.fps = int(cam.get("fps") or 0)
        camera.updated_at = now  # freshness marker for the stale-camera job
    await db.commit()


@app.get("/api/v1/status")
async def api_status():
    database_status = await check_database()
    now = time.time()
    engines = [
        {"engine": name, "seconds_ago": round(now - hb["last_seen"]), "cameras": hb["cameras"], "fps": hb["fps"]}
        for name, hb in _AI_HEARTBEATS.items()
    ]
    ai_online = any(e["seconds_ago"] <= AI_OFFLINE_AFTER_S for e in engines)
    return {
        "status": "online",
        "ai": "online" if ai_online else "offline",
        "aiEngines": engines,
        "database": database_status,
        "wsConnections": len(manager.active_connections),
    }


@app.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    db: AsyncSession = Depends(get_db),
):
    # Live alerts are sensitive: require a valid access token (?token=...)
    try:
        payload = decode_access_token(websocket.query_params.get("token", ""))
        if payload.get("type") != "access" or not payload.get("sub") or not payload.get("organization_id"):
            raise ValueError("invalid token")
        origin = websocket.headers.get("origin")
        if origin and origin not in settings.allowed_origins:
            raise ValueError("invalid origin")
        user = (await db.execute(
            select(User).where(
                User.id == payload["sub"],
                User.organization_id == payload["organization_id"],
                User.is_active.is_(True),
                User.status == "active",
            )
        )).scalar_one_or_none()
        if user is None:
            raise ValueError("inactive user")
    except Exception:
        await websocket.close(code=1008)
        return
    await manager.connect(websocket, str(payload["organization_id"]))
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
async def ws_broadcast(message: dict, _caller=Depends(require_permission_or_service("alerts:write"))):
    """Internal endpoint — broadcast a message to all connected WebSocket clients."""
    await manager.broadcast(message)
    return {"delivered": len(manager.active_connections)}
