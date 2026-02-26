"""Communication tools — emails, tickets, client communication logging."""

import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.agent_tools import ToolDefinition
from app.db.models import Communication, EmailTicket, Client
from app.db.enums import (
    CommunicationChannelEnum, CommunicationDirectionEnum,
    CommunicationStatusEnum, EmailTicketStatusEnum,
)


def draft_email(db: Session, params: dict, org_id: int) -> dict:
    """Draft an email (does NOT send — requires approval)."""
    validation_error = _validate_email_params(params)
    if validation_error:
        return validation_error
    return {
        "draft": {
            "to": params.get("to_email", ""),
            "subject": params.get("subject", ""),
            "body": params.get("body", ""),
            "entity_type": params.get("entity_type"),
            "entity_id": params.get("entity_id"),
        },
        "status": "draft_ready",
        "note": "Email draft created. Requires human approval to send.",
    }


_EMAIL_RE = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')


def _validate_email_params(params: dict) -> dict | None:
    """Validate email parameters. Returns error dict or None if valid."""
    to_email = params.get("to_email", "")
    if not to_email or not _EMAIL_RE.match(to_email):
        return {"error": f"Dirección de email inválida: {to_email}"}
    # Sanitize subject — strip newlines to prevent header injection
    if "subject" in params:
        params["subject"] = params["subject"].replace("\n", " ").replace("\r", " ")[:500]
    # Truncate body
    if "body" in params:
        params["body"] = params["body"][:10000]
    return None


def send_email(db: Session, params: dict, org_id: int) -> dict:
    """Send an email and log the communication. REQUIRES APPROVAL."""
    validation_error = _validate_email_params(params)
    if validation_error:
        return validation_error

    from app.core.email import send_email_notification

    comm = Communication(
        organization_id=org_id,
        entity_type=params.get("entity_type"),
        entity_id=params.get("entity_id"),
        channel=CommunicationChannelEnum.EMAIL.value,
        direction=CommunicationDirectionEnum.OUTBOUND.value,
        subject=params.get("subject", ""),
        body_text=params.get("body", ""),
        from_value=params.get("from_email", "no-reply@logan.cl"),
        to_value=params.get("to_email", ""),
        status=CommunicationStatusEnum.SENT.value,
    )
    db.add(comm)
    db.flush()

    try:
        send_email_notification(
            to_email=params["to_email"],
            subject=params["subject"],
            body=params["body"],
        )
        return {"communication_id": comm.id, "status": "sent"}
    except Exception as exc:
        comm.status = CommunicationStatusEnum.FAILED.value
        db.flush()
        return {"communication_id": comm.id, "status": "failed", "error": str(exc)}


def log_communication(db: Session, params: dict, org_id: int) -> dict:
    """Log a communication (phone call, whatsapp, in-person meeting)."""
    comm = Communication(
        organization_id=org_id,
        entity_type=params.get("entity_type"),
        entity_id=params.get("entity_id"),
        channel=params.get("channel", CommunicationChannelEnum.PHONE.value),
        direction=params.get("direction", CommunicationDirectionEnum.OUTBOUND.value),
        subject=params.get("subject"),
        body_text=params.get("notes"),
        from_value=params.get("from_value"),
        to_value=params.get("to_value"),
        status=CommunicationStatusEnum.LOGGED.value,
    )
    db.add(comm)
    db.flush()
    return {"communication_id": comm.id, "status": "logged"}


def get_email_tickets(db: Session, params: dict, org_id: int) -> dict:
    """Get email tickets with optional status filter."""
    q = db.query(EmailTicket).filter(EmailTicket.organization_id == org_id)
    if params.get("status"):
        q = q.filter(EmailTicket.status == params["status"])
    if params.get("client_id"):
        q = q.filter(EmailTicket.client_id == params["client_id"])
    tickets = q.order_by(EmailTicket.received_at.desc()).limit(params.get("limit", 10)).all()
    return {
        "count": len(tickets),
        "tickets": [
            {
                "id": t.id,
                "subject": t.subject,
                "from_email": t.from_email,
                "status": t.status,
                "received_at": str(t.received_at),
                "sla_24h": str(t.sla_due_24h_at) if t.sla_due_24h_at else None,
            }
            for t in tickets
        ],
    }


def get_communications_history(db: Session, params: dict, org_id: int) -> dict:
    """Get communication history for an entity (matter, client, lead)."""
    q = db.query(Communication).filter(Communication.organization_id == org_id)
    if params.get("entity_type") and params.get("entity_id"):
        q = q.filter(
            Communication.entity_type == params["entity_type"],
            Communication.entity_id == params["entity_id"],
        )
    comms = q.order_by(Communication.created_at.desc()).limit(params.get("limit", 15)).all()
    return {
        "count": len(comms),
        "communications": [
            {
                "id": c.id,
                "channel": c.channel,
                "direction": c.direction,
                "subject": c.subject,
                "to": c.to_value,
                "from": c.from_value,
                "status": c.status,
                "created_at": str(c.created_at),
            }
            for c in comms
        ],
    }


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="draft_email",
        description="Preparar un borrador de email profesional. No envía el email, solo prepara el borrador.",
        input_schema={
            "type": "object",
            "properties": {
                "to_email": {"type": "string", "description": "Email del destinatario"},
                "subject": {"type": "string", "description": "Asunto del email"},
                "body": {"type": "string", "description": "Cuerpo del email en texto"},
                "entity_type": {"type": "string", "description": "Tipo de entidad relacionada (matter, lead, client)"},
                "entity_id": {"type": "integer", "description": "ID de la entidad relacionada"},
            },
            "required": ["to_email", "subject", "body"],
        },
        handler=draft_email,
        skill_key="email_management",
    ),
    ToolDefinition(
        name="send_email",
        description="Enviar un email al cliente y registrar la comunicación. REQUIERE APROBACIÓN HUMANA.",
        input_schema={
            "type": "object",
            "properties": {
                "to_email": {"type": "string", "description": "Email del destinatario"},
                "subject": {"type": "string", "description": "Asunto del email"},
                "body": {"type": "string", "description": "Cuerpo del email"},
                "entity_type": {"type": "string"},
                "entity_id": {"type": "integer"},
            },
            "required": ["to_email", "subject", "body"],
        },
        handler=send_email,
        requires_approval=True,
        skill_key="comunicaciones",
    ),
    ToolDefinition(
        name="log_communication",
        description="Registrar una comunicación (llamada, whatsapp, reunión) con un cliente.",
        input_schema={
            "type": "object",
            "properties": {
                "channel": {"type": "string", "description": "phone, email, whatsapp, in_person"},
                "direction": {"type": "string", "description": "inbound o outbound"},
                "subject": {"type": "string", "description": "Asunto/motivo"},
                "notes": {"type": "string", "description": "Notas de la comunicación"},
                "entity_type": {"type": "string"},
                "entity_id": {"type": "integer"},
                "from_value": {"type": "string"},
                "to_value": {"type": "string"},
            },
            "required": ["channel", "direction"],
        },
        handler=log_communication,
        skill_key="comunicaciones",
    ),
    ToolDefinition(
        name="get_email_tickets",
        description="Obtener tickets de email con filtros de estado y cliente.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "new, drafting, sent, closed, etc."},
                "client_id": {"type": "integer"},
                "limit": {"type": "integer"},
            },
        },
        handler=get_email_tickets,
        skill_key="email_management",
    ),
    ToolDefinition(
        name="get_communications_history",
        description="Obtener historial de comunicaciones para una entidad (causa, cliente, lead).",
        input_schema={
            "type": "object",
            "properties": {
                "entity_type": {"type": "string", "description": "matter, client, lead"},
                "entity_id": {"type": "integer", "description": "ID de la entidad"},
                "limit": {"type": "integer"},
            },
        },
        handler=get_communications_history,
        skill_key="comunicaciones",
    ),
]
