from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum


class Task(TimestampMixin, OrgMixin, Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    task_type: Mapped[str] = mapped_column(
        PgEnum(TaskTypeEnum, name="task_type_enum"), default=TaskTypeEnum.GENERAL, nullable=False
    )
    status: Mapped[str] = mapped_column(
        PgEnum(TaskStatusEnum, name="task_status_enum"),
        default=TaskStatusEnum.OPEN, nullable=False, index=True
    )
    assigned_to_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    assigned_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    due_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sla_policy: Mapped[str] = mapped_column(
        PgEnum(SLAPolicyEnum, name="sla_policy_enum"),
        default=SLAPolicyEnum.NONE, nullable=False
    )
