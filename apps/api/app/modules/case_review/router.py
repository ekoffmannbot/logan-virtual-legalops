from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.case_review.schemas import (
    OpenMattersListResponse,
    MovementCreate,
    MovementResponse,
    NoMovementResponse,
)
from app.modules.case_review import service

router = APIRouter()


@router.get("/open-matters", response_model=OpenMattersListResponse)
def get_open_matters(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Load open matters for daily case review with client_name, last_movement_at, assigned_to."""
    return service.load_open_matters(db, current_user.organization_id)


@router.post("/{matter_id}/movement", response_model=MovementResponse)
def register_movement(
    matter_id: int,
    data: MovementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a court movement for a matter, optionally creating a deadline."""
    return service.register_movement(
        db, matter_id, data, current_user.organization_id, current_user
    )


@router.post("/{matter_id}/no-movement", response_model=NoMovementResponse)
def register_no_movement(
    matter_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark that a matter had no movement during review."""
    return service.register_no_movement(db, matter_id, current_user.organization_id)
