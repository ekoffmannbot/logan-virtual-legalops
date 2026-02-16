from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models import User
from app.modules.leads.schemas import (
    LeadCreate,
    LeadUpdate,
    LeadResponse,
    LeadListResponse,
    LeadDetailResponse,
    TransitionRequest,
    ContactAttemptCreate,
    ScheduleMeetingRequest,
    ConvertToClientResponse,
)
from app.modules.leads import service

router = APIRouter()


# --------------------------------------------------------------------------
# Core CRUD endpoints (what the frontend expects)
# --------------------------------------------------------------------------

@router.get("/", response_model=LeadListResponse)
def list_leads(
    status: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /leads
    Returns Lead[] array.  Each item includes ``assigned_to_name`` resolved
    from the User table via outerjoin.
    """
    items, total = service.list_leads(
        db, current_user.organization_id, status, source, skip, limit
    )
    return LeadListResponse(items=items, total=total)


@router.post("/", response_model=LeadResponse, status_code=201)
def create_lead(
    data: LeadCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    POST /leads
    Body: { full_name, email, phone, source, notes }
    Returns the newly created Lead with ``assigned_to_name``.
    """
    return service.create_lead(db, data, current_user.organization_id)


@router.get("/{lead_id}", response_model=LeadDetailResponse)
def get_lead(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    GET /leads/{id}
    Returns the full lead detail including ``assigned_to_name`` and a
    ``timeline`` array built from AuditLog + Communication records.
    """
    return service.get_lead_detail(db, lead_id, current_user.organization_id)


@router.post("/{lead_id}/transition", response_model=LeadResponse)
def transition_lead(
    lead_id: int,
    data: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    POST /leads/{id}/transition
    Body: { action: "contacted" | "meeting_scheduled" | "proposal_sent" | "won" | "lost" }
    Transitions the lead's status and returns the updated Lead.
    """
    return service.transition_lead(
        db, lead_id, current_user.organization_id, data.action, current_user
    )


# --------------------------------------------------------------------------
# Legacy endpoints (kept for backward compatibility)
# --------------------------------------------------------------------------

@router.patch("/{lead_id}", response_model=LeadResponse)
def update_lead(
    lead_id: int,
    data: LeadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a lead."""
    return service.update_lead(db, lead_id, current_user.organization_id, data)


@router.post("/{lead_id}/contact-attempt", response_model=LeadResponse)
def contact_attempt(
    lead_id: int,
    data: ContactAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a contact attempt for a lead (creates Communication, updates status)."""
    return service.contact_attempt(
        db, lead_id, current_user.organization_id, data, current_user
    )


@router.post("/{lead_id}/schedule-meeting", response_model=LeadResponse)
def schedule_meeting(
    lead_id: int,
    data: ScheduleMeetingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Schedule a meeting for a lead (sets status to MEETING_SCHEDULED)."""
    return service.schedule_meeting(
        db, lead_id, current_user.organization_id, data.meeting_notes
    )


@router.post("/{lead_id}/convert-to-client", response_model=ConvertToClientResponse)
def convert_to_client(
    lead_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Convert a lead into a client (creates Client, marks lead as WON)."""
    return service.convert_to_client(db, lead_id, current_user.organization_id)
