from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Integer, String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AIAgentConversation(Base):
    __tablename__ = "ai_agent_conversations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    organization_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )
    from_agent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("ai_agents.id"), nullable=True, index=True
    )
    to_agent_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("ai_agents.id"), nullable=True, index=True
    )
    from_user_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=True
    )
    thread_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    message_role: Mapped[str] = mapped_column(String(20), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tool_calls: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    token_count_input: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    token_count_output: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )
