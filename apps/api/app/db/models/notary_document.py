from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import NotaryDocTypeEnum, NotaryDocStatusEnum


class NotaryDocument(TimestampMixin, OrgMixin, Base):
    __tablename__ = "notary_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    matter_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("matters.id"), nullable=True)
    doc_type: Mapped[str] = mapped_column(
        PgEnum(NotaryDocTypeEnum, name="notary_doc_type_enum"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        PgEnum(NotaryDocStatusEnum, name="notary_doc_status_enum"),
        default=NotaryDocStatusEnum.ANTECEDENTS_REQUESTED, nullable=False, index=True
    )
    notary_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    received_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notary_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    client_signed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    archived_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
