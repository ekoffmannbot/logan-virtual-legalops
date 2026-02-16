from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.enums import EmailTicketStatusEnum
from app.db.models import EmailTicket, User, Matter, AuditLog
from app.modules.email_tickets.schemas import (
    EmailTicketPatchRequest,
    SendRequest,
)


# ------------------------------------------------------------------
# Constants
# ------------------------------------------------------------------
CLOSED_STATUSES = {
    EmailTicketStatusEnum.CLOSED,
    EmailTicketStatusEnum.RECEIPT_CONFIRMED,
}

ALLOWED_TRANSITIONS: dict[str, EmailTicketStatusEnum] = {
    "draft": EmailTicketStatusEnum.DRAFTING,
    "submit_for_approval": EmailTicketStatusEnum.WAITING_MANAGER_APPROVAL,
    "approve": EmailTicketStatusEnum.SENT,
    "send": EmailTicketStatusEnum.SENT,
    "confirm_receipt": EmailTicketStatusEnum.RECEIPT_CONFIRMED,
    "close": EmailTicketStatusEnum.CLOSED,
}

TRANSITION_FROM: dict[str, set[EmailTicketStatusEnum]] = {
    "draft": {EmailTicketStatusEnum.NEW},
    "submit_for_approval": {EmailTicketStatusEnum.DRAFTING},
    "approve": {EmailTicketStatusEnum.WAITING_MANAGER_APPROVAL},
    "send": {EmailTicketStatusEnum.DRAFTING, EmailTicketStatusEnum.WAITING_MANAGER_APPROVAL},
    "confirm_receipt": {EmailTicketStatusEnum.SENT},
    "close": {EmailTicketStatusEnum.RECEIPT_CONFIRMED},
}


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------
def _get_ticket_or_404(db: Session, ticket_id: int, org_id: int) -> EmailTicket:
    ticket = (
        db.query(EmailTicket)
        .filter(EmailTicket.id == ticket_id, EmailTicket.organization_id == org_id)
        .first()
    )
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket de email no encontrado",
        )
    return ticket


def _extract_from_name(from_email: str) -> str:
    """Extract a display name from the email address (text before @)."""
    if not from_email:
        return ""
    local = from_email.split("@")[0]
    # Convert dots/underscores to spaces and title-case
    return local.replace(".", " ").replace("_", " ").title()


def _compute_sla_24h_met(ticket: EmailTicket) -> Optional[bool]:
    if ticket.sla_due_24h_at is None:
        return None
    if ticket.last_outbound_sent_at is not None:
        return ticket.last_outbound_sent_at <= ticket.sla_due_24h_at
    return None


def _compute_sla_48h_met(ticket: EmailTicket) -> Optional[bool]:
    if ticket.sla_due_48h_at is None:
        return None
    if ticket.last_outbound_sent_at is not None:
        return ticket.last_outbound_sent_at <= ticket.sla_due_48h_at
    return None


def _resolve_assigned_to_name(db: Session, user_id: Optional[int]) -> Optional[str]:
    if user_id is None:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    return user.full_name if user else None


def _resolve_matter_title(db: Session, matter_id: Optional[int]) -> Optional[str]:
    if matter_id is None:
        return None
    matter = db.query(Matter).filter(Matter.id == matter_id).first()
    return matter.title if matter else None


def _ticket_to_item(db: Session, ticket: EmailTicket) -> dict:
    """Build list-item dict matching EmailTicketItem schema."""
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "from_email": ticket.from_email,
        "from_name": _extract_from_name(ticket.from_email),
        "received_at": ticket.received_at,
        "status": ticket.status if isinstance(ticket.status, str) else ticket.status.value,
        "assigned_to": ticket.assigned_to_user_id,
        "assigned_to_name": _resolve_assigned_to_name(db, ticket.assigned_to_user_id),
        "sla_24h_deadline": ticket.sla_due_24h_at,
        "sla_48h_deadline": ticket.sla_due_48h_at,
        "sla_24h_met": _compute_sla_24h_met(ticket),
        "sla_48h_met": _compute_sla_48h_met(ticket),
        "created_at": ticket.created_at,
    }


def _ticket_to_detail(db: Session, ticket: EmailTicket) -> dict:
    """Build detail dict matching EmailTicketDetail schema."""
    return {
        "id": ticket.id,
        "subject": ticket.subject,
        "from_email": ticket.from_email,
        "from_name": _extract_from_name(ticket.from_email),
        "body": ticket.notes,
        "received_at": ticket.received_at,
        "status": ticket.status if isinstance(ticket.status, str) else ticket.status.value,
        "assigned_to": ticket.assigned_to_user_id,
        "assigned_to_name": _resolve_assigned_to_name(db, ticket.assigned_to_user_id),
        "sla_24h_deadline": ticket.sla_due_24h_at,
        "sla_48h_deadline": ticket.sla_due_48h_at,
        "sla_24h_met": _compute_sla_24h_met(ticket),
        "sla_48h_met": _compute_sla_48h_met(ticket),
        "draft_response": ticket.notes,
        "matter_id": ticket.matter_id,
        "matter_title": _resolve_matter_title(db, ticket.matter_id),
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
    }


def _log_action(
    db: Session,
    ticket: EmailTicket,
    action: str,
    actor: User,
    *,
    before: Optional[dict] = None,
    after: Optional[dict] = None,
) -> None:
    """Write an AuditLog entry for the ticket."""
    log = AuditLog(
        organization_id=ticket.organization_id,
        actor_user_id=actor.id,
        action=action,
        entity_type="email_ticket",
        entity_id=ticket.id,
        before_json=before,
        after_json=after,
    )
    db.add(log)


# ------------------------------------------------------------------
# List tickets  GET /email-tickets
# ------------------------------------------------------------------
def list_tickets(
    db: Session,
    org_id: int,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
) -> list[dict]:
    """Return list of email tickets as EmailTicketItem dicts."""
    query = db.query(EmailTicket).filter(EmailTicket.organization_id == org_id)
    if status_filter:
        query = query.filter(EmailTicket.status == status_filter)
    if client_id:
        query = query.filter(EmailTicket.client_id == client_id)
    tickets = (
        query.order_by(EmailTicket.received_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_ticket_to_item(db, t) for t in tickets]


# ------------------------------------------------------------------
# Stats  GET /email-tickets/stats
# ------------------------------------------------------------------
def get_stats(db: Session, org_id: int) -> dict:
    """Compute aggregate stats for the email tickets dashboard."""
    base = db.query(EmailTicket).filter(EmailTicket.organization_id == org_id)
    total = base.count()

    open_count = (
        base.filter(
            EmailTicket.status.notin_([
                EmailTicketStatusEnum.CLOSED.value,
                EmailTicketStatusEnum.RECEIPT_CONFIRMED.value,
            ])
        ).count()
    )

    unassigned = (
        base.filter(EmailTicket.assigned_to_user_id.is_(None)).count()
    )

    now = datetime.now(timezone.utc)
    risk_threshold = now + timedelta(hours=4)

    # At risk: not yet past 24h deadline but within 4 hours of it
    sla_at_risk = (
        base.filter(
            EmailTicket.sla_due_24h_at.isnot(None),
            EmailTicket.sla_due_24h_at > now,
            EmailTicket.sla_due_24h_at <= risk_threshold,
            EmailTicket.status.notin_([
                EmailTicketStatusEnum.CLOSED.value,
                EmailTicketStatusEnum.RECEIPT_CONFIRMED.value,
                EmailTicketStatusEnum.SENT.value,
            ]),
            # Only at risk if not already responded
            EmailTicket.last_outbound_sent_at.is_(None),
        ).count()
    )

    # Breached: past 24h deadline without timely outbound,
    # or status is sla_breached_*
    sla_breached = (
        base.filter(
            EmailTicket.status.notin_([
                EmailTicketStatusEnum.CLOSED.value,
                EmailTicketStatusEnum.RECEIPT_CONFIRMED.value,
                EmailTicketStatusEnum.SENT.value,
            ]),
            or_(
                # Past 24h deadline without outbound (or outbound after deadline)
                (
                    (EmailTicket.sla_due_24h_at.isnot(None))
                    & (EmailTicket.sla_due_24h_at < now)
                    & (
                        (EmailTicket.last_outbound_sent_at.is_(None))
                        | (EmailTicket.last_outbound_sent_at > EmailTicket.sla_due_24h_at)
                    )
                ),
                EmailTicket.status == EmailTicketStatusEnum.SLA_BREACHED_24H.value,
                EmailTicket.status == EmailTicketStatusEnum.SLA_BREACHED_48H.value,
            ),
        ).count()
    )

    return {
        "total": total,
        "open": open_count,
        "sla_at_risk": sla_at_risk,
        "sla_breached": sla_breached,
        "unassigned": unassigned,
    }


# ------------------------------------------------------------------
# Detail  GET /email-tickets/{id}
# ------------------------------------------------------------------
def get_detail(db: Session, ticket_id: int, org_id: int) -> dict:
    ticket = _get_ticket_or_404(db, ticket_id, org_id)
    return _ticket_to_detail(db, ticket)


# ------------------------------------------------------------------
# Timeline  GET /email-tickets/{id}/timeline
# ------------------------------------------------------------------
def get_timeline(db: Session, ticket_id: int, org_id: int) -> list[dict]:
    """Return audit log entries for this ticket as timeline events."""
    _get_ticket_or_404(db, ticket_id, org_id)  # existence check

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "email_ticket",
            AuditLog.entity_id == ticket_id,
            AuditLog.organization_id == org_id,
        )
        .order_by(AuditLog.created_at.asc())
        .all()
    )

    events = []
    for log in logs:
        actor_name = None
        if log.actor_user_id:
            user = db.query(User).filter(User.id == log.actor_user_id).first()
            actor_name = user.full_name if user else None

        detail = None
        if log.after_json:
            detail = log.after_json.get("detail") or log.after_json.get("status")

        events.append({
            "id": log.id,
            "action": log.action,
            "actor_name": actor_name,
            "created_at": log.created_at,
            "detail": detail,
        })

    return events


# ------------------------------------------------------------------
# Patch  PATCH /email-tickets/{id}
# ------------------------------------------------------------------
def patch_ticket(
    db: Session,
    ticket_id: int,
    org_id: int,
    data: EmailTicketPatchRequest,
    current_user: User,
) -> dict:
    """Update draft_response (stored in notes field)."""
    ticket = _get_ticket_or_404(db, ticket_id, org_id)
    old_notes = ticket.notes

    if data.draft_response is not None:
        ticket.notes = data.draft_response

    _log_action(
        db, ticket, "patch_draft",
        current_user,
        before={"notes": old_notes},
        after={"notes": ticket.notes},
    )

    db.commit()
    db.refresh(ticket)
    return _ticket_to_detail(db, ticket)


# ------------------------------------------------------------------
# Transition  POST /email-tickets/{id}/transition
# ------------------------------------------------------------------
def transition(
    db: Session,
    ticket_id: int,
    org_id: int,
    action: str,
    current_user: User,
) -> dict:
    """
    Generic status transition driven by action name.
    Valid actions: draft, submit_for_approval, approve, send,
                   confirm_receipt, close
    """
    if action not in ALLOWED_TRANSITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Accion desconocida: {action}. "
                   f"Permitidas: {', '.join(ALLOWED_TRANSITIONS.keys())}",
        )

    ticket = _get_ticket_or_404(db, ticket_id, org_id)
    current_status = EmailTicketStatusEnum(ticket.status)
    target_status = ALLOWED_TRANSITIONS[action]

    valid_from = TRANSITION_FROM.get(action, set())
    if current_status not in valid_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transicion no permitida: {current_status.value} --({action})--> {target_status.value}",
        )

    old_status = ticket.status

    ticket.status = target_status

    # Side effects
    if target_status == EmailTicketStatusEnum.SENT:
        ticket.last_outbound_sent_at = datetime.now(timezone.utc)
    if target_status == EmailTicketStatusEnum.DRAFTING and not ticket.assigned_to_user_id:
        ticket.assigned_to_user_id = current_user.id

    _log_action(
        db, ticket, f"transition:{action}",
        current_user,
        before={"status": old_status if isinstance(old_status, str) else old_status.value},
        after={"status": target_status.value},
    )

    db.commit()
    db.refresh(ticket)
    return _ticket_to_detail(db, ticket)


# ------------------------------------------------------------------
# Send  POST /email-tickets/{id}/send
# ------------------------------------------------------------------
def send_email(
    db: Session,
    ticket_id: int,
    org_id: int,
    data: SendRequest,
    current_user: User,
) -> dict:
    """
    Send the drafted response. Stores the body in notes,
    transitions to SENT, and sets last_outbound_sent_at.
    """
    ticket = _get_ticket_or_404(db, ticket_id, org_id)
    current_status = EmailTicketStatusEnum(ticket.status)

    # Allow sending from DRAFTING or WAITING_MANAGER_APPROVAL
    allowed_from = {
        EmailTicketStatusEnum.DRAFTING,
        EmailTicketStatusEnum.WAITING_MANAGER_APPROVAL,
    }
    if current_status not in allowed_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede enviar desde estado: {current_status.value}",
        )

    old_status = ticket.status
    ticket.status = EmailTicketStatusEnum.SENT
    ticket.last_outbound_sent_at = datetime.now(timezone.utc)
    ticket.notes = data.body

    _log_action(
        db, ticket, "send",
        current_user,
        before={"status": old_status if isinstance(old_status, str) else old_status.value},
        after={"status": EmailTicketStatusEnum.SENT.value, "detail": "Email enviado"},
    )

    db.commit()
    db.refresh(ticket)
    return _ticket_to_detail(db, ticket)
