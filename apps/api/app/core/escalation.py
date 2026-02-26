"""
Escalation Manager — decides when and how to escalate agent actions to the Gerente Legal.

Escalation triggers:
1. Skill is_autonomous=False → always requires human approval
2. Error count >= threshold → automatic escalation
3. External actions (send email, file court document) → always escalate
4. Agent explicitly requests escalation via tool
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import AIAgent, Notification, AuditLog

logger = logging.getLogger(__name__)

# Actions that ALWAYS require human approval regardless of autonomy settings
ALWAYS_ESCALATE_ACTIONS = {
    "send_email",
    "file_court_document",
    "submit_to_notary",
    "make_payment",
    "sign_document",
    "delete_record",
    "publish_document",
}


class EscalationManager:
    """Manages escalation of agent actions to the Gerente Legal."""

    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.organization_id = organization_id
        self._error_counts: dict[int, int] = {}  # agent_id -> consecutive errors

    def should_escalate(
        self,
        agent: AIAgent,
        skill_key: Optional[str] = None,
        tool_name: Optional[str] = None,
        error_count: int = 0,
    ) -> tuple[bool, str]:
        """
        Determine if an action should be escalated to the human.

        Returns:
            (should_escalate, reason)
        """
        # 1. External/dangerous actions always escalate
        if tool_name and tool_name in ALWAYS_ESCALATE_ACTIONS:
            return True, f"Acción externa requiere aprobación: {tool_name}"

        # 2. Check skill autonomy
        if skill_key:
            for skill in agent.skills:
                if skill.skill_key == skill_key and skill.is_enabled:
                    if not skill.is_autonomous:
                        return True, f"Skill '{skill.skill_name}' requiere aprobación manual"
                    break

        # 3. Error threshold
        threshold = settings.AGENT_ESCALATION_THRESHOLD
        if error_count >= threshold:
            return True, f"Agente ha fallado {error_count} veces consecutivas (umbral: {threshold})"

        return False, ""

    def escalate(
        self,
        agent: AIAgent,
        reason: str,
        task_id: Optional[int] = None,
        context: Optional[dict] = None,
    ) -> int:
        """
        Create an escalation — notification + audit log entry.

        Returns the notification ID.
        """
        # Find Gerente Legal user
        from app.db.models import User
        from app.db.enums import RoleEnum

        gerente = self.db.query(User).filter(
            User.organization_id == self.organization_id,
            User.role == RoleEnum.GERENTE_LEGAL.value,
            User.active.is_(True),
        ).first()

        # Create notification
        notification = Notification(
            organization_id=self.organization_id,
            user_id=gerente.id if gerente else 1,
            title=f"Escalación: {agent.display_name}",
            message=reason,
            type="agent_escalation",
            entity_type="ai_agent_task",
            entity_id=task_id,
        )
        self.db.add(notification)

        # Create audit log
        audit = AuditLog(
            organization_id=self.organization_id,
            actor_user_id=gerente.id if gerente else None,
            agent_id=agent.id,
            action="agent_escalation",
            entity_type="ai_agent_task",
            entity_id=task_id,
            after_json={
                "reason": reason,
                "agent_name": agent.display_name,
                "context": context or {},
            },
        )
        self.db.add(audit)
        self.db.flush()

        logger.info(
            "Escalation created: agent=%s reason=%s task_id=%s notification_id=%s",
            agent.display_name, reason, task_id, notification.id,
        )
        return notification.id

    def record_error(self, agent_id: int) -> int:
        """Record a consecutive error for an agent. Returns new error count."""
        self._error_counts[agent_id] = self._error_counts.get(agent_id, 0) + 1
        return self._error_counts[agent_id]

    def clear_errors(self, agent_id: int):
        """Clear consecutive error count after successful execution."""
        self._error_counts[agent_id] = 0
