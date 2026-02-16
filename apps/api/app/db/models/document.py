from typing import Optional

from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import DocumentTypeEnum, DocumentStatusEnum


class Document(TimestampMixin, OrgMixin, Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entity_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    entity_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    doc_type: Mapped[str] = mapped_column(
        PgEnum(DocumentTypeEnum, name="document_type_enum"), nullable=False
    )
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1000), nullable=False)
    version_int: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(
        PgEnum(DocumentStatusEnum, name="document_status_enum"),
        default=DocumentStatusEnum.DRAFT, nullable=False
    )
    uploaded_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
