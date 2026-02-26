"""Agent logs service — queries AIAgentTask + AuditLog for agent activity."""

from typing import Optional

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models.audit_log import AuditLog
from app.db.models import AIAgent, AIAgentTask


def get_agent_logs(
    db: Session,
    org_id: int,
    limit: int = 50,
    agent_id: Optional[int] = None,
    status: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
) -> list:
    """Get agent activity logs from AIAgentTask + AuditLog entries."""

    # ── Entity-scoped query: use AuditLog directly ───────────────────
    if entity_type and entity_id:
        audit_q = db.query(AuditLog).filter(
            AuditLog.organization_id == org_id,
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id,
        )
        if agent_id:
            audit_q = audit_q.filter(AuditLog.agent_id == agent_id)
        logs = audit_q.order_by(AuditLog.created_at.desc()).limit(limit).all()

        agent_names: dict[int, str] = {}
        result = []
        for log in logs:
            after = log.after_json or {}
            a_name = after.get("agent", "Sistema")
            if log.agent_id:
                if log.agent_id not in agent_names:
                    agent = db.query(AIAgent).filter(AIAgent.id == log.agent_id).first()
                    agent_names[log.agent_id] = agent.display_name if agent else "Agente"
                a_name = agent_names[log.agent_id]
            result.append({
                "id": f"al-{log.id}",
                "agentName": a_name,
                "agentId": log.agent_id,
                "action": after.get("detail", log.action),
                "detail": after.get("detail_long", after.get("detail", None)),
                "timestamp": log.created_at,
                "status": after.get("status", "completed"),
                "entityType": log.entity_type,
                "entityId": str(log.entity_id) if log.entity_id else None,
                "actionRequired": after.get("action_required", False),
            })
        return result

    result = []

    # ── Primary source: AIAgentTask ──────────────────────────────────
    task_q = db.query(AIAgentTask).filter(AIAgentTask.organization_id == org_id)
    if agent_id:
        task_q = task_q.filter(AIAgentTask.agent_id == agent_id)
    if status:
        task_q = task_q.filter(AIAgentTask.status == status)

    tasks = task_q.order_by(AIAgentTask.created_at.desc()).limit(limit).all()

    # Cache agent names
    agent_names: dict[int, str] = {}
    for task in tasks:
        if task.agent_id not in agent_names:
            agent = db.query(AIAgent).filter(AIAgent.id == task.agent_id).first()
            agent_names[task.agent_id] = agent.display_name if agent else "Agente"

        output = task.output_data or {}
        result.append({
            "id": f"at-{task.id}",
            "agentName": agent_names.get(task.agent_id, "Agente"),
            "agentId": task.agent_id,
            "action": task.task_type,
            "detail": output.get("response", task.error_message or task.task_type)[:300],
            "timestamp": task.created_at,
            "status": task.status,
            "entityType": "ai_agent_task",
            "entityId": str(task.id),
            "actionRequired": task.status == "escalated",
            "escalationReason": task.escalation_reason,
            "triggerType": task.trigger_type,
        })

    # ── Secondary source: AuditLog (legacy + agent-tagged) ──────────
    if not agent_id and len(result) < limit:
        remaining = limit - len(result)
        audit_q = db.query(AuditLog).filter(
            AuditLog.organization_id == org_id,
            or_(
                AuditLog.agent_id.isnot(None),
                AuditLog.actor_user_id.is_(None),
                AuditLog.action.like("auto:%"),
            ),
        )
        if status:
            # Can only filter by status in after_json for audit logs
            pass  # AuditLog doesn't have status column

        logs = audit_q.order_by(AuditLog.created_at.desc()).limit(remaining).all()

        for log in logs:
            after = log.after_json or {}
            log_status = after.get("status", "completed")
            action_required = after.get("action_required", False)

            # Resolve agent name from agent_id or after_json
            agent_name = after.get("agent", "Sistema")
            if log.agent_id and log.agent_id in agent_names:
                agent_name = agent_names[log.agent_id]
            elif log.agent_id:
                agent = db.query(AIAgent).filter(AIAgent.id == log.agent_id).first()
                if agent:
                    agent_name = agent.display_name
                    agent_names[log.agent_id] = agent_name

            result.append({
                "id": f"al-{log.id}",
                "agentName": agent_name,
                "agentId": log.agent_id,
                "action": after.get("detail", log.action),
                "detail": after.get("detail_long", after.get("detail", None)),
                "timestamp": log.created_at,
                "status": log_status,
                "entityType": log.entity_type,
                "entityId": str(log.entity_id) if log.entity_id else None,
                "actionRequired": action_required,
            })

    # Sort by timestamp descending
    result.sort(key=lambda x: x["timestamp"] if x["timestamp"] else "", reverse=True)
    return result[:limit]
