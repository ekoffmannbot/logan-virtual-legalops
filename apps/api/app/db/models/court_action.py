from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import CourtActionMethodEnum, CourtActionStatusEnum


class CourtAction(TimestampMixin, OrgMixin, Base):
    __tablename__ = "court_actions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    matter_id: Mapped[int] = mapped_column(Integer, ForeignKey("matters.id"), nullable=False, index=True)
    action_type: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(
        PgEnum(CourtActionMethodEnum, name="court_action_method_enum"), nullable=False
    )
    must_appear_in_court: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(
        PgEnum(CourtActionStatusEnum, name="court_action_status_enum"),
        default=CourtActionStatusEnum.DRAFT, nullable=False, index=True
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    receipt_confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    evidence_document_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("documents.id"), nullable=True)
