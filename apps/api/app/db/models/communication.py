from typing import Optional

from sqlalchemy import String, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import CommunicationChannelEnum, CommunicationDirectionEnum, CommunicationStatusEnum


class Communication(TimestampMixin, OrgMixin, Base):
    __tablename__ = "communications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    channel: Mapped[str] = mapped_column(
        PgEnum(CommunicationChannelEnum, name="comm_channel_enum"), nullable=False
    )
    direction: Mapped[str] = mapped_column(
        PgEnum(CommunicationDirectionEnum, name="comm_direction_enum"), nullable=False
    )
    subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    body_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    from_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    to_value: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        PgEnum(CommunicationStatusEnum, name="comm_status_enum"),
        default=CommunicationStatusEnum.LOGGED, nullable=False
    )
    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    external_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
