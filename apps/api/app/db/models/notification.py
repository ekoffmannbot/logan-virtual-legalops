"""Notification model for in-app + push notifications."""

from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, OrgMixin


class Notification(TimestampMixin, OrgMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # sla_alert, deadline, payment, etc.
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=True)  # matter, invoice, email_ticket, etc.
    entity_id: Mapped[int] = mapped_column(Integer, nullable=True)
    read_at = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", backref="notifications", lazy="select")
