from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import CollectionCaseStatusEnum


class CollectionCase(TimestampMixin, OrgMixin, Base):
    __tablename__ = "collection_cases"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        PgEnum(CollectionCaseStatusEnum, name="collection_case_status_enum"),
        default=CollectionCaseStatusEnum.CHEQUES_PENDING, nullable=False, index=True
    )
    last_contact_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    next_action_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    suspended_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    terminated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
