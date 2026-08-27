from datetime import UTC, datetime
from uuid import uuid4

from backend.app.core.database import Base
from sqlalchemy import JSON, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        String(2000),
        nullable=False,
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="medium",
        index=True,
    )

    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="open",
        index=True,
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
    )

    assigned_to: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    event_ids: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    evidence: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    notes: Mapped[list | None] = mapped_column(
        JSON,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    organization_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("organizations.id"),
        nullable=True,
        index=True,
    )
