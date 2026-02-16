from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


def PgEnum(enum_class, **kwargs):
    """Wrapper around SQLAlchemy Enum that uses .value (lowercase) for PostgreSQL storage."""
    return SAEnum(
        enum_class,
        values_callable=lambda e: [i.value for i in e],
        **kwargs,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class OrgMixin:
    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )
