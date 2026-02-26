from typing import Optional

from sqlalchemy import Boolean, Integer, String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AIAgentSkill(Base):
    __tablename__ = "ai_agent_skills"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("ai_agents.id"), nullable=False, index=True)
    skill_key: Mapped[str] = mapped_column(String(100), nullable=False)
    skill_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_autonomous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    config_json: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Relationship
    agent = relationship("AIAgent", back_populates="skills")
