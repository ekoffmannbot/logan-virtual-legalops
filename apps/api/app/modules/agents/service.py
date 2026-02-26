"""Service layer for Agents module — CRUD, execution, cost tracking."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.agent_runtime import AgentRuntime
from app.db.models import AIAgent, AIAgentSkill, AIAgentConversation, AIAgentTask
from app.db.models.audit_log import AuditLog


class AgentService:
    """Business logic for agent operations."""

    def __init__(self, db: Session, organization_id: int):
        self.db = db
        self.org_id = organization_id

    # ── CRUD ──────────────────────────────────────────────────────────────

    def list_agents(self) -> list[AIAgent]:
        return (
            self.db.query(AIAgent)
            .filter(AIAgent.organization_id == self.org_id)
            .order_by(AIAgent.id)
            .all()
        )

    def get_agent(self, agent_id: int) -> Optional[AIAgent]:
        return (
            self.db.query(AIAgent)
            .filter(AIAgent.id == agent_id, AIAgent.organization_id == self.org_id)
            .first()
        )

    def get_agent_by_role(self, role: str) -> Optional[AIAgent]:
        return (
            self.db.query(AIAgent)
            .filter(
                AIAgent.organization_id == self.org_id,
                AIAgent.role == role,
                AIAgent.is_active.is_(True),
            )
            .first()
        )

    def update_agent(self, agent_id: int, data: dict) -> Optional[AIAgent]:
        agent = self.get_agent(agent_id)
        if not agent:
            return None
        for key, value in data.items():
            if value is not None and hasattr(agent, key):
                setattr(agent, key, value)
        self.db.flush()
        return agent

    def update_skill(self, agent_id: int, skill_id: int, data: dict) -> Optional[AIAgentSkill]:
        skill = (
            self.db.query(AIAgentSkill)
            .filter(AIAgentSkill.id == skill_id, AIAgentSkill.agent_id == agent_id)
            .first()
        )
        if not skill:
            return None
        for key, value in data.items():
            if value is not None and hasattr(skill, key):
                setattr(skill, key, value)
        self.db.flush()
        return skill

    # ── Execution ─────────────────────────────────────────────────────────

    def execute_agent(
        self,
        agent_id: int,
        message: str,
        thread_id: Optional[str] = None,
        context: Optional[dict] = None,
        task_type: str = "chat",
        user_id: Optional[int] = None,
    ) -> dict:
        agent = self.get_agent(agent_id)
        if not agent:
            return {"error": "Agente no encontrado", "status": "error"}

        runtime = AgentRuntime(self.db, self.org_id)
        return runtime.execute(
            agent=agent,
            task_input={
                "message": message,
                "context": context or {},
                "task_type": task_type,
            },
            thread_id=thread_id,
            trigger_type="manual",
            from_user_id=user_id,
        )

    # ── Tasks & Conversations ─────────────────────────────────────────────

    def get_agent_tasks(
        self,
        agent_id: int,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[AIAgentTask]:
        q = self.db.query(AIAgentTask).filter(
            AIAgentTask.agent_id == agent_id,
            AIAgentTask.organization_id == self.org_id,
        )
        if status:
            q = q.filter(AIAgentTask.status == status)
        return q.order_by(AIAgentTask.created_at.desc()).offset(offset).limit(limit).all()

    def get_conversations(
        self,
        agent_id: int,
        thread_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[AIAgentConversation]:
        q = self.db.query(AIAgentConversation).filter(
            AIAgentConversation.organization_id == self.org_id,
        )
        if thread_id:
            q = q.filter(AIAgentConversation.thread_id == thread_id)
        else:
            q = q.filter(
                (AIAgentConversation.from_agent_id == agent_id)
                | (AIAgentConversation.to_agent_id == agent_id)
            )
        return q.order_by(AIAgentConversation.created_at.desc()).limit(limit).all()

    # ── Cost Tracking ─────────────────────────────────────────────────────

    def get_agent_costs(self, agent_id: int) -> dict:
        agent = self.get_agent(agent_id)
        if not agent:
            return {"error": "Agente no encontrado"}

        # Aggregate tokens from conversations
        result = (
            self.db.query(
                func.coalesce(func.sum(AIAgentConversation.token_count_input), 0),
                func.coalesce(func.sum(AIAgentConversation.token_count_output), 0),
            )
            .filter(
                AIAgentConversation.from_agent_id == agent_id,
                AIAgentConversation.organization_id == self.org_id,
            )
            .first()
        )
        input_tokens = result[0] if result else 0
        output_tokens = result[1] if result else 0

        task_count = (
            self.db.query(func.count(AIAgentTask.id))
            .filter(
                AIAgentTask.agent_id == agent_id,
                AIAgentTask.organization_id == self.org_id,
            )
            .scalar() or 0
        )

        # Estimate cost based on model
        if "opus" in agent.model_name:
            cost = (input_tokens * 15 + output_tokens * 75) / 1_000_000
        else:
            cost = (input_tokens * 3 + output_tokens * 15) / 1_000_000

        return {
            "agent_id": agent.id,
            "agent_name": agent.display_name,
            "total_input_tokens": input_tokens,
            "total_output_tokens": output_tokens,
            "total_tasks": task_count,
            "estimated_cost_usd": round(cost, 4),
        }

    # ── Task Resolution ────────────────────────────────────────────────

    def resolve_task(
        self,
        agent_id: int,
        task_id: int,
        action: str,
        notes: Optional[str] = None,
        user_id: Optional[int] = None,
    ) -> dict:
        if action not in ("approve", "reject"):
            return {"error": "Accion invalida. Use 'approve' o 'reject'."}

        task = (
            self.db.query(AIAgentTask)
            .filter(
                AIAgentTask.id == task_id,
                AIAgentTask.agent_id == agent_id,
                AIAgentTask.organization_id == self.org_id,
            )
            .first()
        )
        if not task:
            return {"error": "Tarea no encontrada"}

        if task.status != "escalated":
            return {"error": f"La tarea no esta escalada (estado actual: {task.status})"}

        new_status = "completed" if action == "approve" else "failed"
        task.status = new_status
        task.completed_at = datetime.now(timezone.utc)
        if notes:
            task.output_data = {**(task.output_data or {}), "resolution_notes": notes}

        # Create audit log entry
        audit = AuditLog(
            organization_id=self.org_id,
            actor_user_id=user_id,
            agent_id=agent_id,
            action=f"escalation_{action}",
            entity_type="ai_agent_task",
            entity_id=task_id,
            before_json={"status": "escalated"},
            after_json={
                "status": new_status,
                "notes": notes,
                "agent": task.agent_id,
            },
        )
        self.db.add(audit)
        self.db.flush()

        msg = (
            "Escalacion aprobada. Tarea marcada como completada."
            if action == "approve"
            else "Escalacion rechazada. Tarea marcada como fallida."
        )
        return {"task_id": task_id, "new_status": new_status, "message": msg}
