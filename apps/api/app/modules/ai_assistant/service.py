from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models.email_ticket import EmailTicket
from app.db.models.lead import Lead
from app.db.models.matter import Matter
from app.modules.ai_assistant.provider import get_ai_provider
from app.modules.ai_assistant.schemas import AIResponse


def chat(
    db: Session,
    message: str,
    matter_id: Optional[int],
    action: Optional[str],
    org_id: int,
) -> AIResponse:
    """General chat — Claude."""
    provider = get_ai_provider()
    context = ""
    if matter_id:
        context = _build_matter_context(db, matter_id, org_id)
    result = provider.ask(message, context)
    return AIResponse(response=result.get("answer", result.get("draft", str(result))))


def draft_email(
    db: Session,
    matter_id: Optional[int],
    context: Optional[str],
    org_id: int,
) -> AIResponse:
    """Draft an email — Claude."""
    provider = get_ai_provider()
    resolved_context = context or ""
    if matter_id:
        resolved_context = _build_matter_context(db, matter_id, org_id)
    result = provider.draft_email(resolved_context)
    return AIResponse(response=result.get("draft", str(result)))


def draft_proposal(
    db: Session,
    matter_id: Optional[int],
    context: Optional[str],
    org_id: int,
) -> AIResponse:
    """Draft a proposal — Claude."""
    provider = get_ai_provider()
    resolved_context = context or ""
    if matter_id:
        resolved_context = _build_matter_context(db, matter_id, org_id)
    result = provider.draft_proposal(resolved_context)
    return AIResponse(response=result.get("draft", str(result)))


def summarize_case(
    db: Session,
    matter_id: int,
    org_id: int,
) -> AIResponse:
    """Analyze a matter — Claude."""
    provider = get_ai_provider()
    context = _build_matter_context(db, matter_id, org_id)
    result = provider.summarize_matter(context)
    return AIResponse(response=result.get("summary", str(result)))


# ── Context builders ─────────────────────────────────────────────────────────

def _build_matter_context(db: Session, matter_id: int, org_id: int) -> str:
    """Build a text context from a Matter and its related data."""
    matter = (
        db.query(Matter)
        .filter(Matter.id == matter_id, Matter.organization_id == org_id)
        .first()
    )
    if not matter:
        raise HTTPException(status_code=404, detail="Causa no encontrada")

    parts = [
        f"Titulo: {matter.title}",
        f"Tipo: {matter.matter_type}",
        f"Estado: {matter.status}",
        f"Tribunal: {matter.court_name or 'No asignado'}",
        f"ROL: {matter.rol_number or 'No asignado'}",
    ]
    if matter.description:
        parts.append(f"Descripcion: {matter.description}")

    # Client info
    from app.db.models.client import Client
    if matter.client_id:
        client = db.query(Client).filter(Client.id == matter.client_id).first()
        if client:
            parts.append(f"\nCliente: {client.full_name_or_company}")
            if client.rut:
                parts.append(f"RUT: {client.rut}")
            if client.email:
                parts.append(f"Email: {client.email}")

    # Deadlines
    from app.db.models.deadline import Deadline
    deadlines = (
        db.query(Deadline)
        .filter(Deadline.matter_id == matter_id)
        .order_by(Deadline.due_at.asc())
        .limit(5)
        .all()
    )
    if deadlines:
        parts.append("\nPlazos:")
        for d in deadlines:
            status = d.status if isinstance(d.status, str) else d.status.value
            severity = d.severity if isinstance(d.severity, str) else d.severity.value
            due = d.due_at.strftime("%Y-%m-%d") if d.due_at else "Sin fecha"
            parts.append(f"  - {d.title} | Vence: {due} | Severidad: {severity} | Estado: {status}")

    # Court actions
    from app.db.models.court_action import CourtAction
    actions = (
        db.query(CourtAction)
        .filter(CourtAction.matter_id == matter_id)
        .order_by(CourtAction.created_at.desc())
        .limit(5)
        .all()
    )
    if actions:
        parts.append("\nGestiones judiciales recientes:")
        for a in actions:
            parts.append(f"  - {a.description or 'Sin descripción'} | Estado: {a.status}")

    # Communications
    from app.db.models.communication import Communication
    comms = (
        db.query(Communication)
        .filter(
            Communication.entity_type == "matter",
            Communication.entity_id == matter_id,
        )
        .order_by(Communication.created_at.desc())
        .limit(5)
        .all()
    )
    if comms:
        parts.append("\nComunicaciones recientes:")
        for c in comms:
            channel = c.channel if isinstance(c.channel, str) else c.channel.value
            parts.append(f"  - [{channel}] {c.subject or ''}: {(c.body_text or '')[:100]}")

    return "\n".join(parts)
