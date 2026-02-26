"""System tools — health checks, audit trail, notifications, agent handoff."""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.agent_tools import ToolDefinition
from app.db.models import (
    AuditLog, Notification, AIAgent, AIAgentTask, Task,
    EmailTicket, Invoice, Matter,
)
from app.db.enums import AgentTaskStatusEnum


def get_system_health(db: Session, params: dict, org_id: int) -> dict:
    """Get system health overview — counts of key entities and recent activity."""
    now = datetime.now(timezone.utc)
    return {
        "matters": {
            "total": db.query(func.count(Matter.id)).filter(Matter.organization_id == org_id).scalar() or 0,
            "open": db.query(func.count(Matter.id)).filter(
                Matter.organization_id == org_id, Matter.status == "open"
            ).scalar() or 0,
        },
        "invoices": {
            "total": db.query(func.count(Invoice.id)).filter(Invoice.organization_id == org_id).scalar() or 0,
            "overdue": db.query(func.count(Invoice.id)).filter(
                Invoice.organization_id == org_id, Invoice.status == "overdue"
            ).scalar() or 0,
        },
        "email_tickets": {
            "total": db.query(func.count(EmailTicket.id)).filter(EmailTicket.organization_id == org_id).scalar() or 0,
            "new": db.query(func.count(EmailTicket.id)).filter(
                EmailTicket.organization_id == org_id, EmailTicket.status == "new"
            ).scalar() or 0,
        },
        "tasks": {
            "open": db.query(func.count(Task.id)).filter(
                Task.organization_id == org_id, Task.status == "open"
            ).scalar() or 0,
        },
        "agents": {
            "total": db.query(func.count(AIAgent.id)).filter(AIAgent.organization_id == org_id).scalar() or 0,
            "active": db.query(func.count(AIAgent.id)).filter(
                AIAgent.organization_id == org_id, AIAgent.is_active.is_(True)
            ).scalar() or 0,
        },
        "agent_tasks_today": db.query(func.count(AIAgentTask.id)).filter(
            AIAgentTask.organization_id == org_id,
            AIAgentTask.created_at >= now.replace(hour=0, minute=0, second=0),
        ).scalar() or 0,
    }


def get_audit_trail(db: Session, params: dict, org_id: int) -> dict:
    """Get recent audit log entries."""
    q = db.query(AuditLog).filter(AuditLog.organization_id == org_id)
    if params.get("entity_type"):
        q = q.filter(AuditLog.entity_type == params["entity_type"])
    if params.get("action"):
        q = q.filter(AuditLog.action == params["action"])
    if params.get("agent_id"):
        q = q.filter(AuditLog.agent_id == params["agent_id"])
    logs = q.order_by(AuditLog.created_at.desc()).limit(params.get("limit", 20)).all()
    return {
        "count": len(logs),
        "logs": [
            {
                "id": log.id,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "agent_id": log.agent_id,
                "user_id": log.actor_user_id,
                "created_at": str(log.created_at),
            }
            for log in logs
        ],
    }


def create_notification(db: Session, params: dict, org_id: int) -> dict:
    """Create a notification for a user."""
    notification = Notification(
        organization_id=org_id,
        user_id=params["user_id"],
        title=params["title"],
        message=params["message"],
        type=params.get("type", "agent_notification"),
        entity_type=params.get("entity_type"),
        entity_id=params.get("entity_id"),
    )
    db.add(notification)
    db.flush()
    return {"notification_id": notification.id, "status": "created"}


def request_agent_handoff(db: Session, params: dict, org_id: int) -> dict:
    """Request handoff to another agent by role. Used for inter-agent collaboration."""
    target_role = params["target_role"]
    message = params["message"]
    context = params.get("context", {})

    target_agent = db.query(AIAgent).filter(
        AIAgent.organization_id == org_id,
        AIAgent.role == target_role,
        AIAgent.is_active.is_(True),
    ).first()

    if not target_agent:
        return {"error": f"No se encontró agente activo con rol '{target_role}'"}

    return {
        "handoff_to": {
            "agent_id": target_agent.id,
            "agent_name": target_agent.display_name,
            "role": target_agent.role,
        },
        "message": message,
        "context": context,
        "status": "handoff_requested",
        "note": "Use the agent bus to deliver this message to the target agent",
    }


def get_tasks(db: Session, params: dict, org_id: int) -> dict:
    """Get system tasks with optional filters."""
    q = db.query(Task).filter(Task.organization_id == org_id)
    if params.get("status"):
        q = q.filter(Task.status == params["status"])
    if params.get("assigned_role"):
        q = q.filter(Task.assigned_role == params["assigned_role"])
    if params.get("task_type"):
        q = q.filter(Task.task_type == params["task_type"])
    tasks = q.order_by(Task.due_at.nulls_last()).limit(params.get("limit", 10)).all()
    return {
        "count": len(tasks),
        "tasks": [
            {
                "id": t.id,
                "title": t.title,
                "type": t.task_type,
                "status": t.status,
                "due_at": str(t.due_at) if t.due_at else None,
                "assigned_role": t.assigned_role,
                "entity_type": t.entity_type,
                "entity_id": t.entity_id,
            }
            for t in tasks
        ],
    }


def create_task(db: Session, params: dict, org_id: int) -> dict:
    """Create a new system task."""
    task = Task(
        organization_id=org_id,
        title=params["title"],
        description=params.get("description"),
        entity_type=params.get("entity_type"),
        entity_id=params.get("entity_id"),
        task_type=params.get("task_type", "general"),
        status="open",
        assigned_role=params.get("assigned_role"),
        due_at=datetime.fromisoformat(params["due_at"]) if params.get("due_at") else None,
    )
    db.add(task)
    db.flush()
    return {"task_id": task.id, "status": "created"}


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="get_system_health",
        description="Obtener resumen de salud del sistema: causas, facturas, tickets, tareas y agentes.",
        input_schema={
            "type": "object",
            "properties": {},
        },
        handler=get_system_health,
        skill_key="monitoreo_sistema",
    ),
    ToolDefinition(
        name="get_audit_trail",
        description="Obtener registros de auditoría recientes con filtros opcionales.",
        input_schema={
            "type": "object",
            "properties": {
                "entity_type": {"type": "string"},
                "action": {"type": "string"},
                "agent_id": {"type": "integer"},
                "limit": {"type": "integer"},
            },
        },
        handler=get_audit_trail,
        skill_key="logs_analysis",
    ),
    ToolDefinition(
        name="create_notification",
        description="Crear una notificación para un usuario.",
        input_schema={
            "type": "object",
            "properties": {
                "user_id": {"type": "integer", "description": "ID del usuario destinatario"},
                "title": {"type": "string", "description": "Título de la notificación"},
                "message": {"type": "string", "description": "Mensaje de la notificación"},
                "type": {"type": "string", "description": "Tipo: agent_notification, alert, reminder"},
                "entity_type": {"type": "string"},
                "entity_id": {"type": "integer"},
            },
            "required": ["user_id", "title", "message"],
        },
        handler=create_notification,
        skill_key="alertas_tecnicas",
    ),
    ToolDefinition(
        name="request_agent_handoff",
        description="Solicitar transferencia de tarea a otro agente por su rol. Para colaboración inter-agente.",
        input_schema={
            "type": "object",
            "properties": {
                "target_role": {"type": "string", "description": "Rol del agente destino (e.g. secretaria, abogado_jefe)"},
                "message": {"type": "string", "description": "Mensaje/instrucción para el agente destino"},
                "context": {"type": "object", "description": "Contexto adicional para el agente destino"},
            },
            "required": ["target_role", "message"],
        },
        handler=request_agent_handoff,
    ),
    ToolDefinition(
        name="get_tasks",
        description="Obtener tareas del sistema con filtros de estado, rol asignado y tipo.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "open, in_progress, done, cancelled"},
                "assigned_role": {"type": "string"},
                "task_type": {"type": "string"},
                "limit": {"type": "integer"},
            },
        },
        handler=get_tasks,
        skill_key="apoyo_general",
    ),
    ToolDefinition(
        name="create_task",
        description="Crear una nueva tarea en el sistema.",
        input_schema={
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Título de la tarea"},
                "description": {"type": "string"},
                "task_type": {"type": "string", "description": "general, follow_up_proposal, callback, etc."},
                "assigned_role": {"type": "string"},
                "due_at": {"type": "string", "description": "Fecha límite ISO"},
                "entity_type": {"type": "string"},
                "entity_id": {"type": "integer"},
            },
            "required": ["title"],
        },
        handler=create_task,
        skill_key="apoyo_general",
    ),
]
