"""
Agent Bus — inter-agent messaging and collaboration.

Handles message passing between agents with:
- Thread management for conversations
- Depth limits to prevent infinite loops
- Celery task dispatch for async delivery
- Message persistence in ai_agent_conversations
"""

import logging
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.core.agent_runtime import AgentRuntime
from app.db.models import AIAgent, AIAgentConversation
from app.db.enums import AgentMessageRoleEnum

logger = logging.getLogger(__name__)

MAX_CONVERSATION_DEPTH = 10


class AgentBus:
    """Message bus for inter-agent communication."""

    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.org_id = organization_id

    def send_message(
        self,
        from_agent_id: int,
        to_agent_role: str,
        message: str,
        context: Optional[dict] = None,
        thread_id: Optional[str] = None,
    ) -> dict:
        """
        Send a message from one agent to another.

        Args:
            from_agent_id: Source agent ID
            to_agent_role: Target agent's role (e.g., "secretaria")
            message: The message content
            context: Additional context dict
            thread_id: Thread ID for conversation continuity

        Returns:
            Dict with response, thread_id, target agent info
        """
        thread_id = thread_id or str(uuid.uuid4())

        # Check conversation depth
        depth = self._get_thread_depth(thread_id)
        if depth >= MAX_CONVERSATION_DEPTH:
            return {
                "status": "depth_exceeded",
                "message": f"Conversación inter-agente alcanzó el límite de {MAX_CONVERSATION_DEPTH} turnos. Escalando al Gerente Legal.",
                "thread_id": thread_id,
            }

        # Find target agent
        target = self.db.query(AIAgent).filter(
            AIAgent.organization_id == self.org_id,
            AIAgent.role == to_agent_role,
            AIAgent.is_active.is_(True),
        ).first()

        if not target:
            return {
                "status": "error",
                "message": f"No se encontró agente activo con rol '{to_agent_role}'",
                "thread_id": thread_id,
            }

        # Execute the target agent
        runtime = AgentRuntime(self.db, self.org_id)
        result = runtime.execute(
            agent=target,
            task_input={
                "message": message,
                "context": context or {},
                "task_type": "agent_collaboration",
            },
            thread_id=thread_id,
            trigger_type="agent_request",
            from_agent_id=from_agent_id,
        )

        return {
            "status": result.get("status", "unknown"),
            "response": result.get("response", ""),
            "thread_id": thread_id,
            "target_agent": {
                "id": target.id,
                "name": target.display_name,
                "role": target.role if isinstance(target.role, str) else target.role.value,
            },
            "task_id": result.get("task_id"),
        }

    def broadcast(
        self,
        from_agent_id: int,
        message: str,
        exclude_roles: Optional[set[str]] = None,
    ) -> list[dict]:
        """Send a message to all active agents (except sender and excluded roles)."""
        agents = self.db.query(AIAgent).filter(
            AIAgent.organization_id == self.org_id,
            AIAgent.is_active.is_(True),
            AIAgent.id != from_agent_id,
        ).all()

        results = []
        for agent in agents:
            role_val = agent.role if isinstance(agent.role, str) else agent.role.value
            if exclude_roles and role_val in exclude_roles:
                continue
            result = self.send_message(
                from_agent_id=from_agent_id,
                to_agent_role=role_val,
                message=message,
            )
            results.append(result)
        return results

    def _get_thread_depth(self, thread_id: str) -> int:
        """Count the number of messages in a thread."""
        return (
            self.db.query(AIAgentConversation)
            .filter(
                AIAgentConversation.thread_id == thread_id,
                AIAgentConversation.organization_id == self.org_id,
            )
            .count()
        )


def send_agent_message_async(
    from_agent_id: int,
    to_agent_role: str,
    org_id: int,
    message: str,
    context: Optional[dict] = None,
    thread_id: Optional[str] = None,
):
    """
    Dispatch an inter-agent message via Celery for async delivery.
    """
    from app.tasks.agent_bus_tasks import deliver_agent_message
    deliver_agent_message.delay(
        from_agent_id=from_agent_id,
        to_agent_role=to_agent_role,
        org_id=org_id,
        message=message,
        context=context,
        thread_id=thread_id,
    )
