from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models import User
from app.modules.proposals.schemas import (
    ProposalCreate,
    ProposalUpdate,
    ProposalResponse,
    ProposalDetailResponse,
    ProposalListResponse,
    ProposalPipeline,
    TransitionRequest,
)
from app.modules.proposals import service

router = APIRouter()


@router.get("/pipeline", response_model=ProposalPipeline)
def get_pipeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all proposals grouped by status (pipeline/kanban view)."""
    return service.get_pipeline(db, current_user.organization_id)


@router.get("/", response_model=ProposalListResponse)
def list_proposals(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List proposals with optional status filter."""
    items, total = service.list_proposals(
        db, current_user.organization_id, status, skip, limit
    )
    return ProposalListResponse(items=items, total=total)


@router.get("/{proposal_id}", response_model=ProposalDetailResponse)
def get_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single proposal by ID (detail view with timeline)."""
    return service.get_proposal_detail(db, proposal_id, current_user.organization_id)


@router.post("/", response_model=ProposalResponse, status_code=201)
def create_proposal(
    data: ProposalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new proposal (starts in DRAFT)."""
    return service.create_proposal(
        db, data, current_user.organization_id, current_user.id
    )


@router.patch("/{proposal_id}", response_model=ProposalResponse)
def update_proposal(
    proposal_id: int,
    data: ProposalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a proposal (only while in DRAFT)."""
    return service.update_proposal(
        db, proposal_id, current_user.organization_id, data
    )


@router.post("/{proposal_id}/transition", response_model=ProposalResponse)
def transition_proposal(
    proposal_id: int,
    data: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transition a proposal status via action name (sent, accepted, rejected)."""
    return service.transition_proposal(
        db, proposal_id, current_user.organization_id, data.action
    )


# --- Legacy specific transition endpoints (kept for backward compatibility) ---

@router.post("/{proposal_id}/send", response_model=ProposalResponse)
def send_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a proposal (DRAFT -> SENT). Creates 72h follow-up task."""
    return service.send_proposal(db, proposal_id, current_user.organization_id)


@router.post("/{proposal_id}/accept", response_model=ProposalResponse)
def accept_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Accept a proposal (SENT -> ACCEPTED). Creates a Contract draft."""
    return service.accept_proposal(db, proposal_id, current_user.organization_id)


@router.post("/{proposal_id}/reject", response_model=ProposalResponse)
def reject_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reject a proposal (SENT -> REJECTED)."""
    return service.reject_proposal(db, proposal_id, current_user.organization_id)


@router.post("/{proposal_id}/expire", response_model=ProposalResponse)
def expire_proposal(
    proposal_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Expire a proposal (SENT -> EXPIRED)."""
    return service.expire_proposal(db, proposal_id, current_user.organization_id)
