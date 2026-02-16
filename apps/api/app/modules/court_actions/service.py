from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.enums import CourtActionStatusEnum, CourtActionMethodEnum
from app.db.models.court_action import CourtAction
from app.db.models.user import User
from app.modules.court_actions.schemas import CourtActionCreate, CourtActionUpdate


# ------------------------------------------------------------------
# Allowed status transitions
# ------------------------------------------------------------------
ALLOWED_TRANSITIONS: dict[CourtActionStatusEnum, list[CourtActionStatusEnum]] = {
    CourtActionStatusEnum.DRAFT: [CourtActionStatusEnum.SENT],
    CourtActionStatusEnum.SENT: [CourtActionStatusEnum.RECEIPT_PENDING],
    CourtActionStatusEnum.RECEIPT_PENDING: [CourtActionStatusEnum.RECEIPT_CONFIRMED],
    CourtActionStatusEnum.RECEIPT_CONFIRMED: [CourtActionStatusEnum.FILED],
    CourtActionStatusEnum.FILED: [CourtActionStatusEnum.ARCHIVED],
    CourtActionStatusEnum.ARCHIVED: [],
}


def _validate_transition(
    current: CourtActionStatusEnum, target: CourtActionStatusEnum
) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transición no permitida: {current.value} -> {target.value}",
        )


def _get_action_or_404(
    db: Session, action_id: int, org_id: int
) -> CourtAction:
    action = (
        db.query(CourtAction)
        .filter(CourtAction.id == action_id, CourtAction.organization_id == org_id)
        .first()
    )
    if not action:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Actuación judicial no encontrada",
        )
    return action


# ------------------------------------------------------------------
# CRUD
# ------------------------------------------------------------------
def create(
    db: Session, data: CourtActionCreate, current_user: User
) -> CourtAction:
    """Create a new court action in DRAFT status."""
    action = CourtAction(
        organization_id=current_user.organization_id,
        matter_id=data.matter_id,
        action_type=data.action_type,
        method=data.method,
        must_appear_in_court=data.must_appear_in_court,
        status=CourtActionStatusEnum.DRAFT,
        description=data.description,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def list_by_matter(
    db: Session,
    org_id: int,
    matter_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
) -> dict:
    """Return paginated list of court actions, optionally filtered by matter."""
    query = db.query(CourtAction).filter(CourtAction.organization_id == org_id)
    if matter_id:
        query = query.filter(CourtAction.matter_id == matter_id)
    if status_filter:
        query = query.filter(CourtAction.status == status_filter)
    total = query.count()
    items = (
        query.order_by(CourtAction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": items, "total": total}


def get(db: Session, action_id: int, org_id: int) -> CourtAction:
    """Get a single court action by ID."""
    return _get_action_or_404(db, action_id, org_id)


# ------------------------------------------------------------------
# Workflow transitions
# ------------------------------------------------------------------
def advance_status(
    db: Session,
    action_id: int,
    org_id: int,
    new_status: CourtActionStatusEnum,
    current_user: User,
) -> CourtAction:
    """Generic status advance with validation and side-effects."""
    action = _get_action_or_404(db, action_id, org_id)
    current_status = CourtActionStatusEnum(action.status)
    _validate_transition(current_status, new_status)

    action.status = new_status

    # Side-effects on SENT
    if new_status == CourtActionStatusEnum.SENT:
        action.sent_at = datetime.now(timezone.utc)

    # Side-effects on RECEIPT_CONFIRMED
    if new_status == CourtActionStatusEnum.RECEIPT_CONFIRMED:
        action.receipt_confirmed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(action)
    return action


def send_action(
    db: Session, action_id: int, org_id: int, current_user: User
) -> CourtAction:
    """
    Move court action DRAFT -> SENT. Sets sent_at.
    If method is electronic, auto-advance to RECEIPT_PENDING.
    """
    action = _get_action_or_404(db, action_id, org_id)
    current_status = CourtActionStatusEnum(action.status)
    _validate_transition(current_status, CourtActionStatusEnum.SENT)

    action.status = CourtActionStatusEnum.SENT
    action.sent_at = datetime.now(timezone.utc)

    # If electronic, auto-advance to RECEIPT_PENDING
    if action.method == CourtActionMethodEnum.ELECTRONIC.value or action.method == CourtActionMethodEnum.ELECTRONIC:
        action.status = CourtActionStatusEnum.RECEIPT_PENDING

    db.commit()
    db.refresh(action)
    return action


def confirm_receipt(
    db: Session, action_id: int, org_id: int, current_user: User
) -> CourtAction:
    """Move court action to RECEIPT_CONFIRMED. Sets receipt_confirmed_at."""
    return advance_status(
        db, action_id, org_id,
        CourtActionStatusEnum.RECEIPT_CONFIRMED, current_user,
    )


def upload_evidence(
    db: Session, action_id: int, org_id: int, document_id: int
) -> CourtAction:
    """Attach a document as evidence to a court action."""
    action = _get_action_or_404(db, action_id, org_id)
    action.evidence_document_id = document_id
    db.commit()
    db.refresh(action)
    return action
