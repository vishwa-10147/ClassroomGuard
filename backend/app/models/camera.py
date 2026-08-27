from datetime import UTC, datetime
from uuid import uuid4

from backend.app.core.database import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(
        String(120),
        nullable=False,
    )

    camera_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
    )

    classroom_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("classrooms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="offline",
    )

    stream_url: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    fps: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    resolution: Mapped[str] = mapped_column(
        String(30),
        default="1920x1080",
        nullable=False,
    )

    ai_processing: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    ai_model: Mapped[str | None] = mapped_column(
        String(120),
        nullable=True,
    )

    inference_ms: Mapped[float | None] = mapped_column(
        nullable=True,
    )

    last_frame_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    organization_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("organizations.id"),
        nullable=True,
        index=True,
    )
