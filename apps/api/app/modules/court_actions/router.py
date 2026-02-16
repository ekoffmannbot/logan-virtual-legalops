from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.court_actions.schemas import (
    CourtActionCreate,
    CourtActionResponse,
    CourtActionListResponse,
    UploadEvidenceRequest,
)
from app.modules.court_actions import service

router = APIRouter()


@router.get("/", response_model=CourtActionListResponse)
def list_court_actions(
    matter_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List court actions, optionally filtered by matter."""
    return service.list_by_matter(
        db,
        org_id=current_user.organization_id,
        matter_id=matter_id,
        skip=skip,
        limit=limit,
        status_filter=status,
    )


@router.get("/{action_id}", response_model=CourtActionResponse)
def get_court_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single court action by ID."""
    return service.get(db, action_id, current_user.organization_id)


@router.post("/", response_model=CourtActionResponse, status_code=201)
def create_court_action(
    data: CourtActionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new court action."""
    return service.create(db, data, current_user)


@router.post("/{action_id}/send", response_model=CourtActionResponse)
def send_court_action(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send court action (DRAFT -> SENT). Sets sent_at.
    If method is electronic, auto-advances to RECEIPT_PENDING.
    """
    return service.send_action(
        db, action_id, current_user.organization_id, current_user
    )


@router.post("/{action_id}/confirm-receipt", response_model=CourtActionResponse)
def confirm_receipt(
    action_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm receipt of court action. Sets receipt_confirmed_at."""
    return service.confirm_receipt(
        db, action_id, current_user.organization_id, current_user
    )


@router.post("/{action_id}/upload-evidence", response_model=CourtActionResponse)
def upload_evidence(
    action_id: int,
    body: UploadEvidenceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Attach a document as evidence to a court action."""
    return service.upload_evidence(
        db, action_id, current_user.organization_id, body.document_id
    )
