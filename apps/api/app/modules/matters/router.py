from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.matters.schemas import (
    MatterCreate,
    MatterUpdate,
    MatterResponse,
    MatterDetailResponse,
    MatterListResponse,
    AssignRequest,
    TransitionRequest,
)
from app.modules.matters import service

router = APIRouter()


@router.get("/", response_model=MatterListResponse)
def list_matters(
    status: Optional[str] = Query(None),
    matter_type: Optional[str] = Query(None),
    lawyer_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List matters with optional filters (status, type, lawyer)."""
    items, total = service.list_matters(
        db,
        current_user.organization_id,
        status,
        matter_type,
        lawyer_id,
        skip,
        limit,
    )
    return MatterListResponse(items=items, total=total)


@router.get("/{matter_id}", response_model=MatterDetailResponse)
def get_matter(
    matter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full detail for a single matter (includes deadlines, gestiones, documents, etc.)."""
    return service.get_matter_detail(db, matter_id, current_user.organization_id)


@router.post("/", response_model=MatterResponse, status_code=201)
def create_matter(
    data: MatterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new matter."""
    return service.create_matter(db, data, current_user.organization_id)


@router.patch("/{matter_id}", response_model=MatterResponse)
def update_matter(
    matter_id: int,
    data: MatterUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a matter."""
    return service.update_matter(db, matter_id, current_user.organization_id, data)


@router.post("/{matter_id}/transition", response_model=MatterResponse)
def transition_matter(
    matter_id: int,
    data: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Transition a matter to a new status (open, closed, suspended_nonpayment, terminated)."""
    return service.transition_matter(
        db, matter_id, current_user.organization_id, data.action
    )


@router.post("/{matter_id}/assign-lawyer", response_model=MatterResponse)
def assign_lawyer(
    matter_id: int,
    data: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a lawyer to this matter."""
    return service.assign_lawyer(
        db, matter_id, current_user.organization_id, data.user_id
    )


@router.post("/{matter_id}/assign-procurador", response_model=MatterResponse)
def assign_procurador(
    matter_id: int,
    data: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign a procurador to this matter."""
    return service.assign_procurador(
        db, matter_id, current_user.organization_id, data.user_id
    )
