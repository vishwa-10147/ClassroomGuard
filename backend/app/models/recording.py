from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.core.database import Base


class Recording(Base):
    __tablename__ = "recordings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    file_path: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    classroom_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("classrooms.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    camera_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("cameras.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    duration: Mapped[float] = mapped_column(
        default=0,
        nullable=False,
    )

    file_size: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )

    processing_state: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="queued",
        index=True,
    )

    processing_progress: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    current_frame: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )

    total_frames: Mapped[int] = mapped_column(
        BigInteger,
        default=0,
        nullable=False,
    )

    phase: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    detection_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    event_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    error_message: Mapped[str | None] = mapped_column(
        String(2000),
        nullable=True,
    )

    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )

    organization_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("organizations.id"),
        nullable=True,
        index=True,
    )
