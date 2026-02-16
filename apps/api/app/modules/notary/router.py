from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models import User
from app.modules.notary.schemas import (
    NotaryDocCreate,
    NotaryDocUpdate,
    NotaryDocListItem,
    NotaryDocDetail,
    NotaryStats,
    TimelineEvent,
    ContactAttemptResponse,
    TransitionRequest,
    ContactAttemptCreate,
)
from app.modules.notary import service

router = APIRouter()


# ------------------------------------------------------------------
# GET /notary  -> NotaryDocListItem[]
# ------------------------------------------------------------------
@router.get("/", response_model=List[NotaryDocListItem])
def list_notary_docs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notary documents for the current organisation."""
    return service.list_docs(
        db,
        org_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        client_id=client_id,
    )


# ------------------------------------------------------------------
# GET /notary/stats  -> NotaryStats
# ------------------------------------------------------------------
@router.get("/stats", response_model=NotaryStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return aggregated status counts."""
    return service.get_stats(db, org_id=current_user.organization_id)


# ------------------------------------------------------------------
# GET /notary/{doc_id}  -> NotaryDocDetail
# ------------------------------------------------------------------
@router.get("/{doc_id}", response_model=NotaryDocDetail)
def get_notary_doc(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single notary document by ID."""
    return service.get_detail(db, doc_id, current_user.organization_id)


# ------------------------------------------------------------------
# GET /notary/{doc_id}/timeline  -> TimelineEvent[]
# ------------------------------------------------------------------
@router.get("/{doc_id}/timeline", response_model=List[TimelineEvent])
def get_timeline(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return audit-log timeline for a notary document."""
    return service.get_timeline(db, doc_id, current_user.organization_id)


# ------------------------------------------------------------------
# GET /notary/{doc_id}/contact-attempts  -> ContactAttemptResponse[]
# ------------------------------------------------------------------
@router.get("/{doc_id}/contact-attempts", response_model=List[ContactAttemptResponse])
def get_contact_attempts(
    doc_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return communication records (contact attempts) for a notary document."""
    return service.get_contact_attempts(db, doc_id, current_user.organization_id)


# ------------------------------------------------------------------
# POST /notary/{doc_id}/transition  -> NotaryDocDetail
# ------------------------------------------------------------------
@router.post("/{doc_id}/transition", response_model=NotaryDocDetail)
def transition(
    doc_id: int,
    body: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute a status transition by action name."""
    return service.transition(
        db, doc_id, current_user.organization_id, body.action, current_user
    )


# ------------------------------------------------------------------
# POST /notary/{doc_id}/contact-attempts  -> ContactAttemptResponse
# ------------------------------------------------------------------
@router.post("/{doc_id}/contact-attempts", response_model=ContactAttemptResponse, status_code=201)
def create_contact_attempt(
    doc_id: int,
    data: ContactAttemptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new contact attempt (communication record)."""
    return service.create_contact_attempt(
        db, doc_id, current_user.organization_id, data, current_user
    )


# ------------------------------------------------------------------
# POST /notary  -> NotaryDocDetail  (create)
# ------------------------------------------------------------------
@router.post("/", response_model=NotaryDocDetail, status_code=201)
def create_notary_doc(
    data: NotaryDocCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new notary document."""
    return service.create(db, data, current_user)


# ------------------------------------------------------------------
# PATCH /notary/{doc_id}  -> NotaryDocDetail  (partial update)
# ------------------------------------------------------------------
@router.patch("/{doc_id}", response_model=NotaryDocDetail)
def update_notary_doc(
    doc_id: int,
    data: NotaryDocUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a notary document."""
    return service.update(db, doc_id, current_user.organization_id, data)
