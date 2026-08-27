from backend.app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
)


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def init_db() -> None:
    from backend.app.models.alert import Alert  # noqa: F401
    from backend.app.models.audit_log import AuditLog  # noqa: F401
    from backend.app.models.camera import Camera  # noqa: F401
    from backend.app.models.classroom import Classroom  # noqa: F401
    from backend.app.models.detection_event import DetectionEvent  # noqa: F401
    from backend.app.models.incident import Incident  # noqa: F401
    from backend.app.models.organization import Organization  # noqa: F401
    from backend.app.models.push_token import PushToken  # noqa: F401
    from backend.app.models.recording import Recording  # noqa: F401
    from backend.app.models.refresh_token import RefreshToken  # noqa: F401
    from backend.app.models.role import Role  # noqa: F401
    from backend.app.models.system_setting import SystemSetting  # noqa: F401
    from backend.app.models.user import User  # noqa: F401
    from backend.app.models.webhook import Webhook  # noqa: F401
    from backend.app.models.webhook_delivery import WebhookDelivery  # noqa: F401

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
