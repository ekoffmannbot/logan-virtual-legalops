from datetime import datetime
from typing import Optional

from sqlalchemy import Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import MandateStatusEnum


class Mandate(TimestampMixin, OrgMixin, Base):
    __tablename__ = "mandates"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    matter_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("matters.id"), nullable=True)
    status: Mapped[str] = mapped_column(
        PgEnum(MandateStatusEnum, name="mandate_status_enum"),
        default=MandateStatusEnum.DRAFTING, nullable=False, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
