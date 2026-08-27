from datetime import UTC, datetime
from uuid import uuid4

from backend.app.core.database import Base
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column


class RetentionPolicy(Base):
    __tablename__ = "retention_policies"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4()),
    )

    organization_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    resource_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )

    retention_days: Mapped[int] = mapped_column(
        Integer,
        default=90,
        nullable=False,
    )

    auto_delete: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    archive_before_delete: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    archive_location: Mapped[str | None] = mapped_column(
        String(1000),
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
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
