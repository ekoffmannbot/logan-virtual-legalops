from datetime import datetime, date
from typing import Optional

from sqlalchemy import String, Integer, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import InvoiceStatusEnum, PaymentMethodEnum


class Invoice(TimestampMixin, OrgMixin, Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    matter_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("matters.id"), nullable=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # CLP
    currency: Mapped[str] = mapped_column(String(10), default="CLP")
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        PgEnum(InvoiceStatusEnum, name="invoice_status_enum"),
        default=InvoiceStatusEnum.SCHEDULED, nullable=False, index=True
    )
    payment_method: Mapped[Optional[str]] = mapped_column(
        PgEnum(PaymentMethodEnum, name="payment_method_enum"), nullable=True
    )


class Payment(TimestampMixin, OrgMixin, Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(Integer, ForeignKey("invoices.id"), nullable=False, index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    reference_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
