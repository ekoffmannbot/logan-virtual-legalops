from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import Boolean, Float, Integer, String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, PgEnum, TimestampMixin
from app.db.enums import RoleEnum


class AIAgent(TimestampMixin, Base):
    __tablename__ = "ai_agents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(PgEnum(RoleEnum, name="role_enum", create_type=False), nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    model_provider: Mapped[str] = mapped_column(String(50), nullable=False, default="anthropic")
    model_name: Mapped[str] = mapped_column(String(100), nullable=False, default="claude-sonnet-4-20250514")
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False, default=0.3)
    max_tokens: Mapped[int] = mapped_column(Integer, nullable=False, default=4096)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # Relationships
    skills = relationship("AIAgentSkill", back_populates="agent", cascade="all, delete-orphan", lazy="selectin")
    tasks = relationship("AIAgentTask", back_populates="agent", lazy="dynamic")
