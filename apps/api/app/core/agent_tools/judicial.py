"""Judicial tools — court actions, deadlines, judicial tracking."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.agent_tools import ToolDefinition
from app.db.models import CourtAction, Deadline, Matter
from app.db.enums import CourtActionStatusEnum, DeadlineStatusEnum, DeadlineSeverityEnum


def get_court_actions(db: Session, params: dict, org_id: int) -> dict:
    """Get court actions for a matter or all pending actions."""
    q = db.query(CourtAction).filter(CourtAction.organization_id == org_id)
    if params.get("matter_id"):
        q = q.filter(CourtAction.matter_id == params["matter_id"])
    if params.get("status"):
        q = q.filter(CourtAction.status == params["status"])
    actions = q.order_by(CourtAction.created_at.desc()).limit(params.get("limit", 10)).all()
    return {
        "count": len(actions),
        "court_actions": [
            {
                "id": a.id,
                "matter_id": a.matter_id,
                "action_type": a.action_type,
                "method": a.method,
                "status": a.status,
                "must_appear": a.must_appear_in_court,
                "sent_at": str(a.sent_at) if a.sent_at else None,
                "description": a.description,
            }
            for a in actions
        ],
    }


def create_court_action(db: Session, params: dict, org_id: int) -> dict:
    """Create a new court action/filing record."""
    matter = db.query(Matter).filter(
        Matter.id == params["matter_id"],
        Matter.organization_id == org_id,
    ).first()
    if not matter:
        return {"error": "Causa no encontrada"}

    action = CourtAction(
        organization_id=org_id,
        matter_id=params["matter_id"],
        action_type=params["action_type"],
        method=params.get("method", "electronic"),
        must_appear_in_court=params.get("must_appear", False),
        status=CourtActionStatusEnum.DRAFT.value,
        description=params.get("description"),
    )
    db.add(action)
    db.flush()
    return {"court_action_id": action.id, "status": "draft", "message": "Actuación judicial creada como borrador"}


def get_deadlines(db: Session, params: dict, org_id: int) -> dict:
    """Get upcoming or overdue deadlines."""
    q = db.query(Deadline).filter(Deadline.organization_id == org_id)
    if params.get("matter_id"):
        q = q.filter(Deadline.matter_id == params["matter_id"])
    if params.get("status"):
        q = q.filter(Deadline.status == params["status"])
    else:
        q = q.filter(Deadline.status == DeadlineStatusEnum.OPEN.value)
    if params.get("severity"):
        q = q.filter(Deadline.severity == params["severity"])
    deadlines = q.order_by(Deadline.due_at).limit(params.get("limit", 15)).all()
    now = datetime.now(timezone.utc)
    return {
        "count": len(deadlines),
        "deadlines": [
            {
                "id": d.id,
                "matter_id": d.matter_id,
                "title": d.title,
                "due_at": str(d.due_at),
                "severity": d.severity,
                "status": d.status,
                "is_overdue": d.due_at < now if d.due_at else False,
            }
            for d in deadlines
        ],
    }


def create_deadline(db: Session, params: dict, org_id: int) -> dict:
    """Create a new deadline for a matter."""
    deadline = Deadline(
        organization_id=org_id,
        matter_id=params["matter_id"],
        title=params["title"],
        due_at=datetime.fromisoformat(params["due_at"]),
        severity=params.get("severity", DeadlineSeverityEnum.MED.value),
        status=DeadlineStatusEnum.OPEN.value,
    )
    db.add(deadline)
    db.flush()
    return {"deadline_id": deadline.id, "status": "created"}


def update_court_action_status(db: Session, params: dict, org_id: int) -> dict:
    """Update the status of a court action."""
    action = db.query(CourtAction).filter(
        CourtAction.id == params["court_action_id"],
        CourtAction.organization_id == org_id,
    ).first()
    if not action:
        return {"error": "Actuación judicial no encontrada"}

    old_status = action.status
    action.status = params["new_status"]
    if params["new_status"] == CourtActionStatusEnum.SENT.value and not action.sent_at:
        action.sent_at = datetime.now(timezone.utc)
    if params["new_status"] == CourtActionStatusEnum.RECEIPT_CONFIRMED.value:
        action.receipt_confirmed_at = datetime.now(timezone.utc)
    db.flush()
    return {"court_action_id": action.id, "old_status": old_status, "new_status": action.status}


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="get_court_actions",
        description="Obtener actuaciones judiciales de una causa o todas las pendientes.",
        input_schema={
            "type": "object",
            "properties": {
                "matter_id": {"type": "integer", "description": "ID de la causa"},
                "status": {"type": "string", "description": "draft, sent, filed, archived, etc."},
                "limit": {"type": "integer"},
            },
        },
        handler=get_court_actions,
        skill_key="gestiones_tribunales",
    ),
    ToolDefinition(
        name="create_court_action",
        description="Crear una nueva actuación judicial como borrador.",
        input_schema={
            "type": "object",
            "properties": {
                "matter_id": {"type": "integer", "description": "ID de la causa"},
                "action_type": {"type": "string", "description": "Tipo de actuación (demanda, contestación, recurso, etc.)"},
                "method": {"type": "string", "description": "electronic o in_person"},
                "must_appear": {"type": "boolean", "description": "¿Requiere comparecencia?"},
                "description": {"type": "string", "description": "Descripción de la actuación"},
            },
            "required": ["matter_id", "action_type"],
        },
        handler=create_court_action,
        skill_key="gestiones_tribunales",
    ),
    ToolDefinition(
        name="get_deadlines",
        description="Obtener plazos judiciales pendientes o vencidos.",
        input_schema={
            "type": "object",
            "properties": {
                "matter_id": {"type": "integer"},
                "status": {"type": "string", "description": "open, handled, missed"},
                "severity": {"type": "string", "description": "low, med, high, critical"},
                "limit": {"type": "integer"},
            },
        },
        handler=get_deadlines,
        skill_key="seguimiento_judicial",
    ),
    ToolDefinition(
        name="create_deadline",
        description="Crear un nuevo plazo judicial para una causa.",
        input_schema={
            "type": "object",
            "properties": {
                "matter_id": {"type": "integer", "description": "ID de la causa"},
                "title": {"type": "string", "description": "Descripción del plazo"},
                "due_at": {"type": "string", "description": "Fecha límite en formato ISO (YYYY-MM-DDTHH:MM:SS)"},
                "severity": {"type": "string", "description": "low, med, high, critical"},
            },
            "required": ["matter_id", "title", "due_at"],
        },
        handler=create_deadline,
        skill_key="seguimiento_judicial",
    ),
    ToolDefinition(
        name="update_court_action_status",
        description="Actualizar el estado de una actuación judicial.",
        input_schema={
            "type": "object",
            "properties": {
                "court_action_id": {"type": "integer", "description": "ID de la actuación"},
                "new_status": {"type": "string", "description": "draft, sent, receipt_pending, receipt_confirmed, filed, archived"},
            },
            "required": ["court_action_id", "new_status"],
        },
        handler=update_court_action_status,
        skill_key="gestiones_tribunales",
    ),
]
