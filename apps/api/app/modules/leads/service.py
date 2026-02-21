from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.enums import LeadStatusEnum, CommunicationStatusEnum
from app.db.models import Lead, User, Communication, AuditLog
from app.db.models.client import Client
from app.modules.leads.schemas import (
    LeadCreate,
    LeadUpdate,
    ContactAttemptCreate,
)


# ---------------------------------------------------------------------------
# Transition map  (action string  ->  LeadStatusEnum)
# ---------------------------------------------------------------------------
TRANSITION_MAP: dict[str, LeadStatusEnum] = {
    "contacted": LeadStatusEnum.CONTACTED,
    "meeting_scheduled": LeadStatusEnum.MEETING_SCHEDULED,
    "proposal_sent": LeadStatusEnum.PROPOSAL_SENT,
    "won": LeadStatusEnum.WON,
    "lost": LeadStatusEnum.LOST,
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _lead_to_dict(lead: Lead, assigned_to_name: Optional[str] = None) -> dict:
    """Convert a Lead ORM instance into a dict with assigned_to_name."""
    return {
        "id": lead.id,
        "full_name": lead.full_name,
        "source": lead.source.value if hasattr(lead.source, "value") else lead.source,
        "status": lead.status.value if hasattr(lead.status, "value") else lead.status,
        "phone": lead.phone,
        "email": lead.email,
        "company": getattr(lead, "company", None),  # frontend field
        "rut": getattr(lead, "rut", None),
        "notes": lead.notes,
        "assigned_to_name": assigned_to_name,
        "assigned_to_user_id": lead.assigned_to_user_id,
        "organization_id": lead.organization_id,
        "created_at": lead.created_at,
        "updated_at": lead.updated_at,
    }


def _resolve_assigned_name(db: Session, user_id: Optional[int]) -> Optional[str]:
    """Look up the full_name of the assigned user, or return None."""
    if not user_id:
        return None
    user = db.query(User.full_name).filter(User.id == user_id).first()
    return user[0] if user else None


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def create_lead(db: Session, data: LeadCreate, organization_id: int) -> dict:
    """Create a new lead and return dict with assigned_to_name."""
    lead = Lead(
        organization_id=organization_id,
        source=data.source,
        full_name=data.full_name,
        email=data.email,
        phone=data.phone,
        notes=data.notes,
        status=LeadStatusEnum.NEW,
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return _lead_to_dict(lead, assigned_to_name=None)


def list_leads(
    db: Session,
    organization_id: int,
    status_filter: Optional[str] = None,
    source_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[dict], int]:
    """List leads with assigned_to_name resolved via outerjoin."""
    query = (
        db.query(Lead, User.full_name.label("assigned_to_name"))
        .outerjoin(User, Lead.assigned_to_user_id == User.id)
        .filter(Lead.organization_id == organization_id)
    )
    if status_filter:
        query = query.filter(Lead.status == status_filter)
    if source_filter:
        query = query.filter(Lead.source == source_filter)

    total = query.count()
    rows = query.order_by(Lead.created_at.desc()).offset(skip).limit(limit).all()

    items = [_lead_to_dict(lead, assigned_to_name=name) for lead, name in rows]
    return items, total


def get_lead(db: Session, lead_id: int, organization_id: int) -> Lead:
    """Get a single lead ORM object scoped to the organization (raises 404)."""
    lead = (
        db.query(Lead)
        .filter(Lead.id == lead_id, Lead.organization_id == organization_id)
        .first()
    )
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead no encontrado",
        )
    return lead


def get_lead_detail(db: Session, lead_id: int, organization_id: int) -> dict:
    """
    Return lead detail dict including assigned_to_name and timeline.
    Timeline merges AuditLog + Communication entries for this lead.
    """
    lead = get_lead(db, lead_id, organization_id)
    assigned_to_name = _resolve_assigned_name(db, lead.assigned_to_user_id)

    # --- Build timeline ---------------------------------------------------
    timeline: list[dict] = []

    # AuditLog entries for this lead
    audit_rows = (
        db.query(AuditLog, User.full_name.label("actor_name"))
        .outerjoin(User, AuditLog.actor_user_id == User.id)
        .filter(
            AuditLog.entity_type == "lead",
            AuditLog.entity_id == lead_id,
        )
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    for log, actor_name in audit_rows:
        timeline.append({
            "id": log.id,
            "title": log.action,
            "description": None,
            "timestamp": log.created_at,
            "type": "audit",
            "actor": actor_name,
        })

    # Communication entries for this lead
    comm_rows = (
        db.query(Communication, User.full_name.label("actor_name"))
        .outerjoin(User, Communication.created_by_user_id == User.id)
        .filter(
            Communication.entity_type == "lead",
            Communication.entity_id == lead_id,
        )
        .order_by(Communication.created_at.desc())
        .all()
    )
    for comm, actor_name in comm_rows:
        channel = comm.channel.value if hasattr(comm.channel, "value") else comm.channel
        direction = comm.direction.value if hasattr(comm.direction, "value") else comm.direction
        timeline.append({
            "id": comm.id,
            "title": f"{channel} ({direction})",
            "description": comm.subject or comm.body_text,
            "timestamp": comm.created_at,
            "type": "communication",
            "actor": actor_name,
        })

    # Sort merged timeline by timestamp descending
    timeline.sort(key=lambda e: e["timestamp"], reverse=True)

    result = _lead_to_dict(lead, assigned_to_name)
    result["timeline"] = timeline
    return result


def update_lead(
    db: Session, lead_id: int, organization_id: int, data: LeadUpdate
) -> dict:
    """Partially update a lead."""
    lead = get_lead(db, lead_id, organization_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lead, field, value)
    db.commit()
    db.refresh(lead)
    assigned_to_name = _resolve_assigned_name(db, lead.assigned_to_user_id)
    return _lead_to_dict(lead, assigned_to_name)


# ---------------------------------------------------------------------------
# Transition
# ---------------------------------------------------------------------------

def transition_lead(
    db: Session,
    lead_id: int,
    organization_id: int,
    action: str,
    current_user: User,
) -> dict:
    """
    Transition a lead's status based on the action string.
    Accepted actions: contacted, meeting_scheduled, proposal_sent, won, lost.
    """
    target_status = TRANSITION_MAP.get(action)
    if target_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción no válida: '{action}'. Valores permitidos: {list(TRANSITION_MAP.keys())}",
        )

    lead = get_lead(db, lead_id, organization_id)
    old_status = lead.status.value if hasattr(lead.status, "value") else lead.status
    lead.status = target_status

    # Write audit log entry
    log = AuditLog(
        organization_id=organization_id,
        actor_user_id=current_user.id,
        action=f"lead_transition:{action}",
        entity_type="lead",
        entity_id=lead_id,
        before_json={"status": old_status},
        after_json={"status": target_status.value},
    )
    db.add(log)
    db.commit()
    db.refresh(lead)

    assigned_to_name = _resolve_assigned_name(db, lead.assigned_to_user_id)
    return _lead_to_dict(lead, assigned_to_name)


# ---------------------------------------------------------------------------
# Legacy actions (contact-attempt, schedule-meeting, convert-to-client)
# ---------------------------------------------------------------------------

def contact_attempt(
    db: Session,
    lead_id: int,
    organization_id: int,
    data: ContactAttemptCreate,
    current_user: User,
) -> dict:
    """Log a communication for this lead and set status to CONTACTED."""
    lead = get_lead(db, lead_id, organization_id)

    comm = Communication(
        organization_id=organization_id,
        entity_type="lead",
        entity_id=lead.id,
        channel=data.channel,
        direction=data.direction,
        subject=data.subject,
        body_text=data.body_text,
        from_value=data.from_value,
        to_value=data.to_value,
        status=CommunicationStatusEnum.LOGGED,
        created_by_user_id=current_user.id,
    )
    db.add(comm)

    if lead.status == LeadStatusEnum.NEW.value or lead.status == LeadStatusEnum.NEW:
        lead.status = LeadStatusEnum.CONTACTED

    db.commit()
    db.refresh(lead)
    assigned_to_name = _resolve_assigned_name(db, lead.assigned_to_user_id)
    return _lead_to_dict(lead, assigned_to_name)


def schedule_meeting(
    db: Session,
    lead_id: int,
    organization_id: int,
    meeting_notes: Optional[str] = None,
) -> dict:
    """Mark a lead as MEETING_SCHEDULED."""
    lead = get_lead(db, lead_id, organization_id)
    lead.status = LeadStatusEnum.MEETING_SCHEDULED
    if meeting_notes:
        existing = lead.notes or ""
        lead.notes = f"{existing}\n--- Reunión ---\n{meeting_notes}".strip()
    db.commit()
    db.refresh(lead)
    assigned_to_name = _resolve_assigned_name(db, lead.assigned_to_user_id)
    return _lead_to_dict(lead, assigned_to_name)


def convert_to_client(
    db: Session,
    lead_id: int,
    organization_id: int,
) -> dict:
    """Create a Client record from Lead data and mark the lead as WON."""
    lead = get_lead(db, lead_id, organization_id)

    if lead.status in (LeadStatusEnum.WON.value, LeadStatusEnum.WON):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este lead ya fue convertido a cliente",
        )

    client = Client(
        organization_id=organization_id,
        full_name_or_company=lead.full_name,
        rut=lead.rut,
        email=lead.email,
        phone=lead.phone,
        notes=lead.notes,
    )
    db.add(client)

    lead.status = LeadStatusEnum.WON
    db.commit()
    db.refresh(client)
    db.refresh(lead)

    return {
        "lead_id": lead.id,
        "client_id": client.id,
        "message": "Lead convertido a cliente exitosamente",
    }
