from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import DeadlineSeverityEnum, DeadlineStatusEnum


class Deadline(TimestampMixin, OrgMixin, Base):
    __tablename__ = "deadlines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    matter_id: Mapped[int] = mapped_column(Integer, ForeignKey("matters.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(
        PgEnum(DeadlineSeverityEnum, name="deadline_severity_enum"),
        default=DeadlineSeverityEnum.MED, nullable=False
    )
    status: Mapped[str] = mapped_column(
        PgEnum(DeadlineStatusEnum, name="deadline_status_enum"),
        default=DeadlineStatusEnum.OPEN, nullable=False, index=True
    )
    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
