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
    """General chat endpoint. Optionally scoped to a matter."""
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
    """Draft an email, optionally using a matter or freeform context."""
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
    """Draft a proposal, optionally using a matter or freeform context."""
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
    """Summarize a matter by gathering its context from the DB."""
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

    return "\n".join(parts)
