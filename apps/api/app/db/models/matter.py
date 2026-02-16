from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import MatterTypeEnum, MatterStatusEnum


class Matter(TimestampMixin, OrgMixin, Base):
    __tablename__ = "matters"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    matter_type: Mapped[str] = mapped_column(
        PgEnum(MatterTypeEnum, name="matter_type_enum"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    court_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rol_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(
        PgEnum(MatterStatusEnum, name="matter_status_enum"), default=MatterStatusEnum.OPEN, nullable=False, index=True
    )
    assigned_lawyer_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_procurador_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    client = relationship("Client", back_populates="matters")
