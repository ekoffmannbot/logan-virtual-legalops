"""
Agent dispatch helper for Celery tasks.

Replaces _ai_draft() calls in task files with agent-based execution.
Falls back to the old AI provider if agents are not configured.
"""

import logging
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models import AIAgent

logger = logging.getLogger(__name__)


def agent_draft(
    db: Session,
    org_id: int,
    agent_role: str,
    prompt: str,
    fallback: str,
    task_type: str = "scheduled_task",
) -> str:
    """
    Execute an agent to generate text, with graceful fallback.

    This is the agent-aware replacement for _ai_draft() in Celery tasks.
    """
    try:
        agent = db.query(AIAgent).filter(
            AIAgent.organization_id == org_id,
            AIAgent.role == agent_role,
            AIAgent.is_active.is_(True),
        ).first()

        if not agent:
            logger.debug("No active agent for role %s, using legacy AI", agent_role)
            return _legacy_ai_draft(prompt, fallback)

        from app.core.agent_runtime import AgentRuntime
        runtime = AgentRuntime(db, org_id)
        result = runtime.execute(
            agent=agent,
            task_input={"message": prompt, "task_type": task_type},
            trigger_type="scheduled",
        )

        if result.get("status") == "completed" and result.get("response"):
            return result["response"]

        logger.warning("Agent %s returned status=%s, using fallback", agent_role, result.get("status"))
        return fallback

    except Exception as exc:
        logger.warning("Agent dispatch failed for %s, using fallback: %s", agent_role, exc)
        return _legacy_ai_draft(prompt, fallback)


def get_agent_id(db: Session, org_id: int, agent_role: str) -> Optional[int]:
    """Get the agent ID for a role, for populating audit logs."""
    agent = db.query(AIAgent).filter(
        AIAgent.organization_id == org_id,
        AIAgent.role == agent_role,
        AIAgent.is_active.is_(True),
    ).first()
    return agent.id if agent else None


def _legacy_ai_draft(prompt: str, fallback: str) -> str:
    """Legacy AI call using the old provider system."""
    try:
        from app.modules.ai_assistant.provider import get_ai_provider
        provider = get_ai_provider()
        result = provider.ask(prompt, "")
        return result.get("answer", fallback)
    except Exception as exc:
        logger.warning("Legacy AI draft failed: %s", exc)
        return fallback
