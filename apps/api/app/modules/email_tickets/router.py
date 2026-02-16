from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models import User
from app.modules.email_tickets.schemas import (
    EmailTicketItem,
    EmailTicketDetail,
    EmailTicketStats,
    TimelineEvent,
    EmailTicketPatchRequest,
    TransitionRequest,
    SendRequest,
)
from app.modules.email_tickets import service

router = APIRouter()


# GET /email-tickets
@router.get("/", response_model=List[EmailTicketItem])
def list_email_tickets(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List email tickets for the current organisation."""
    return service.list_tickets(
        db,
        org_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        client_id=client_id,
    )


# GET /email-tickets/stats
@router.get("/stats", response_model=EmailTicketStats)
def email_ticket_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregate stats: total, open, sla_at_risk, sla_breached, unassigned."""
    return service.get_stats(db, current_user.organization_id)


# GET /email-tickets/{ticket_id}
@router.get("/{ticket_id}", response_model=EmailTicketDetail)
def get_email_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single email ticket detail by ID."""
    return service.get_detail(db, ticket_id, current_user.organization_id)


# GET /email-tickets/{ticket_id}/timeline
@router.get("/{ticket_id}/timeline", response_model=List[TimelineEvent])
def get_ticket_timeline(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the audit-log timeline for this ticket."""
    return service.get_timeline(db, ticket_id, current_user.organization_id)


# PATCH /email-tickets/{ticket_id}
@router.patch("/{ticket_id}", response_model=EmailTicketDetail)
def patch_email_ticket(
    ticket_id: int,
    data: EmailTicketPatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the draft response for a ticket."""
    return service.patch_ticket(
        db, ticket_id, current_user.organization_id, data, current_user
    )


# POST /email-tickets/{ticket_id}/transition
@router.post("/{ticket_id}/transition", response_model=EmailTicketDetail)
def transition_ticket(
    ticket_id: int,
    data: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generic status transition.
    Actions: draft, submit_for_approval, approve, send, confirm_receipt, close
    """
    return service.transition(
        db, ticket_id, current_user.organization_id, data.action, current_user
    )


# POST /email-tickets/{ticket_id}/send
@router.post("/{ticket_id}/send", response_model=EmailTicketDetail)
def send_email(
    ticket_id: int,
    data: SendRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send the drafted response email."""
    return service.send_email(
        db, ticket_id, current_user.organization_id, data, current_user
    )
