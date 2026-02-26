"""Time entry model for billable hours tracking."""

from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, OrgMixin


class TimeEntry(TimestampMixin, OrgMixin, Base):
    __tablename__ = "time_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    matter_id: Mapped[int] = mapped_column(Integer, ForeignKey("matters.id"), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    hours: Mapped[float] = mapped_column(Float, nullable=False)
    rate_per_hour: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    billable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    deleted_at = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="time_entries", lazy="select")
    matter = relationship("Matter", backref="time_entries", lazy="select")
