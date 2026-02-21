from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.enums import (
    ProposalStatusEnum,
    ContractStatusEnum,
    TaskTypeEnum,
    TaskStatusEnum,
    SLAPolicyEnum,
    RoleEnum,
)
from app.db.models import Proposal, Client, User, Contract, Task, AuditLog
from app.modules.proposals.schemas import (
    ProposalCreate,
    ProposalUpdate,
    ProposalResponse,
    ProposalDetailResponse,
    ProposalPipeline,
    AcceptProposalResponse,
    TimelineEntry,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_TRANSITIONS = {
    ProposalStatusEnum.DRAFT: {ProposalStatusEnum.SENT},
    ProposalStatusEnum.SENT: {
        ProposalStatusEnum.ACCEPTED,
        ProposalStatusEnum.REJECTED,
        ProposalStatusEnum.EXPIRED,
    },
}


def _assert_transition(current: str, target: ProposalStatusEnum):
    """Raise 400 if the status transition is not allowed."""
    try:
        current_enum = ProposalStatusEnum(current)
    except ValueError:
        current_enum = current  # type: ignore[assignment]

    allowed = _VALID_TRANSITIONS.get(current_enum, set())
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transición no permitida: {current} -> {target.value}",
        )


def _get_status_value(proposal: Proposal) -> str:
    """Normalize status to its string value."""
    return proposal.status if isinstance(proposal.status, str) else proposal.status.value


def _resolve_names(
    db: Session, proposal: Proposal
) -> Tuple[Optional[str], Optional[str]]:
    """Resolve client_name and created_by_name for a proposal."""
    client_name: Optional[str] = None
    created_by_name: Optional[str] = None

    if proposal.client_id:
        client = db.query(Client.full_name_or_company).filter(
            Client.id == proposal.client_id
        ).first()
        if client:
            client_name = client[0]

    if proposal.created_by_user_id:
        user = db.query(User.full_name).filter(
            User.id == proposal.created_by_user_id
        ).first()
        if user:
            created_by_name = user[0]

    return client_name, created_by_name


def _to_response(db: Session, proposal: Proposal) -> ProposalResponse:
    """Convert a Proposal ORM instance to the list-view response shape."""
    client_name, created_by_name = _resolve_names(db, proposal)
    # Build a human-readable title
    title = proposal.strategy_summary_text[:60] if proposal.strategy_summary_text else None
    if not title and client_name:
        title = f"Propuesta {client_name}"
    currency = getattr(proposal, "currency", "CLP") or "CLP"
    return ProposalResponse(
        id=proposal.id,
        title=title,
        client_name=client_name,
        client_id=proposal.client_id,
        amount=proposal.amount,
        currency=currency,
        status=_get_status_value(proposal),
        sent_at=proposal.sent_at,
        expires_at=proposal.expires_at,
        valid_until=proposal.expires_at,  # frontend alias
        assigned_to_name=created_by_name,  # frontend alias
        created_by_name=created_by_name,
        created_at=proposal.created_at,
    )


def _to_detail_response(db: Session, proposal: Proposal) -> ProposalDetailResponse:
    """Convert a Proposal ORM instance to the detail-view response shape."""
    client_name, created_by_name = _resolve_names(db, proposal)

    # Build timeline from AuditLog
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "proposal",
            AuditLog.entity_id == proposal.id,
        )
        .order_by(AuditLog.created_at.asc())
        .all()
    )

    timeline: List[TimelineEntry] = []
    for log in logs:
        actor_name: Optional[str] = None
        if log.actor_user_id:
            actor_row = db.query(User.full_name).filter(
                User.id == log.actor_user_id
            ).first()
            if actor_row:
                actor_name = actor_row[0]

        timeline.append(
            TimelineEntry(
                id=log.id,
                title=log.action,
                description=None,
                timestamp=log.created_at,
                type=log.action,
                actor=actor_name,
            )
        )

    return ProposalDetailResponse(
        id=proposal.id,
        client_id=proposal.client_id,
        client_name=client_name,
        amount=proposal.amount,
        status=_get_status_value(proposal),
        description=proposal.strategy_summary_text,
        sent_at=proposal.sent_at,
        expires_at=proposal.expires_at,
        accepted_at=None,   # model doesn't store these; kept for frontend compat
        rejected_at=None,
        rejection_reason=None,
        created_by_name=created_by_name,
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        timeline=timeline,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def create_proposal(
    db: Session, data: ProposalCreate, organization_id: int, user_id: int
) -> ProposalResponse:
    """Create a new proposal in DRAFT status."""
    now = datetime.now(timezone.utc)

    expires_at = None
    if data.valid_days is not None:
        expires_at = now + timedelta(days=data.valid_days)

    proposal = Proposal(
        organization_id=organization_id,
        client_id=data.client_id,
        status=ProposalStatusEnum.DRAFT,
        amount=data.amount,
        currency="CLP",
        strategy_summary_text=data.description,
        expires_at=expires_at,
        created_by_user_id=user_id,
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)
    return _to_response(db, proposal)


def list_proposals(
    db: Session,
    organization_id: int,
    status_filter: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[ProposalResponse], int]:
    """List proposals filtered by organization and optionally by status."""
    query = db.query(Proposal).filter(Proposal.organization_id == organization_id)
    if status_filter:
        query = query.filter(Proposal.status == status_filter)
    total = query.count()
    items = query.order_by(Proposal.created_at.desc()).offset(skip).limit(limit).all()
    return [_to_response(db, p) for p in items], total


def get_proposal(db: Session, proposal_id: int, organization_id: int) -> Proposal:
    """Get a single proposal ORM object scoped to the organization."""
    proposal = (
        db.query(Proposal)
        .filter(
            Proposal.id == proposal_id,
            Proposal.organization_id == organization_id,
        )
        .first()
    )
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Propuesta no encontrada",
        )
    return proposal


def get_proposal_detail(
    db: Session, proposal_id: int, organization_id: int
) -> ProposalDetailResponse:
    """Get a single proposal as a detail response (with timeline)."""
    proposal = get_proposal(db, proposal_id, organization_id)
    return _to_detail_response(db, proposal)


def update_proposal(
    db: Session, proposal_id: int, organization_id: int, data: ProposalUpdate
) -> ProposalResponse:
    """Partially update a proposal (only while still in DRAFT)."""
    proposal = get_proposal(db, proposal_id, organization_id)
    current = _get_status_value(proposal)
    if current != ProposalStatusEnum.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se pueden editar propuestas en estado borrador",
        )
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(proposal, field, value)
    db.commit()
    db.refresh(proposal)
    return _to_response(db, proposal)


# ---------------------------------------------------------------------------
# Workflow transitions
# ---------------------------------------------------------------------------

def send_proposal(
    db: Session, proposal_id: int, organization_id: int
) -> ProposalResponse:
    """Transition DRAFT -> SENT.

    Side effects:
    - Set sent_at = now
    - Set followup_due_at = now + 72h
    - Create a Task for ADMINISTRACION role with 72h follow-up
    """
    proposal = get_proposal(db, proposal_id, organization_id)
    _assert_transition(_get_status_value(proposal), ProposalStatusEnum.SENT)

    now = datetime.now(timezone.utc)
    proposal.status = ProposalStatusEnum.SENT
    proposal.sent_at = now
    proposal.followup_due_at = now + timedelta(hours=72)

    # Create follow-up task
    task = Task(
        organization_id=organization_id,
        title="Seguimiento propuesta 72h",
        description=f"Hacer seguimiento de la propuesta #{proposal.id} enviada.",
        entity_type="proposal",
        entity_id=proposal.id,
        task_type=TaskTypeEnum.FOLLOW_UP_PROPOSAL,
        status=TaskStatusEnum.OPEN,
        assigned_role=RoleEnum.ADMINISTRACION.value,
        due_at=now + timedelta(hours=72),
        sla_policy=SLAPolicyEnum.PROPOSAL_72H,
    )
    db.add(task)

    db.commit()
    db.refresh(proposal)
    return _to_response(db, proposal)


def accept_proposal(
    db: Session, proposal_id: int, organization_id: int
) -> ProposalResponse:
    """Transition SENT -> ACCEPTED.

    Side effect: Create a Contract draft for the client.
    """
    proposal = get_proposal(db, proposal_id, organization_id)
    _assert_transition(_get_status_value(proposal), ProposalStatusEnum.ACCEPTED)

    proposal.status = ProposalStatusEnum.ACCEPTED

    client_id = proposal.client_id
    if not client_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La propuesta debe tener un client_id para crear contrato",
        )

    contract = Contract(
        organization_id=organization_id,
        client_id=client_id,
        matter_id=proposal.matter_id,
        status=ContractStatusEnum.PENDING_DATA,
        notes=f"Contrato generado automáticamente desde propuesta #{proposal.id}",
    )
    db.add(contract)
    db.commit()
    db.refresh(proposal)

    return _to_response(db, proposal)


def reject_proposal(
    db: Session, proposal_id: int, organization_id: int
) -> ProposalResponse:
    """Transition SENT -> REJECTED."""
    proposal = get_proposal(db, proposal_id, organization_id)
    _assert_transition(_get_status_value(proposal), ProposalStatusEnum.REJECTED)
    proposal.status = ProposalStatusEnum.REJECTED
    db.commit()
    db.refresh(proposal)
    return _to_response(db, proposal)


def expire_proposal(
    db: Session, proposal_id: int, organization_id: int
) -> ProposalResponse:
    """Transition SENT -> EXPIRED."""
    proposal = get_proposal(db, proposal_id, organization_id)
    _assert_transition(_get_status_value(proposal), ProposalStatusEnum.EXPIRED)
    proposal.status = ProposalStatusEnum.EXPIRED
    db.commit()
    db.refresh(proposal)
    return _to_response(db, proposal)


def transition_proposal(
    db: Session, proposal_id: int, organization_id: int, action: str
) -> ProposalResponse:
    """Generic transition dispatcher called by POST /proposals/{id}/transition."""
    action_lower = action.lower().strip()

    if action_lower == "sent":
        return send_proposal(db, proposal_id, organization_id)
    elif action_lower == "accepted":
        return accept_proposal(db, proposal_id, organization_id)
    elif action_lower == "rejected":
        return reject_proposal(db, proposal_id, organization_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción no soportada: '{action}'. Valores válidos: sent, accepted, rejected",
        )


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

def get_pipeline(db: Session, organization_id: int) -> ProposalPipeline:
    """Return all proposals for the organization grouped by status."""
    proposals = (
        db.query(Proposal)
        .filter(Proposal.organization_id == organization_id)
        .order_by(Proposal.created_at.desc())
        .all()
    )

    pipeline = ProposalPipeline()
    for p in proposals:
        p_response = _to_response(db, p)
        status_val = _get_status_value(p)
        if status_val == ProposalStatusEnum.DRAFT.value:
            pipeline.draft.append(p_response)
        elif status_val == ProposalStatusEnum.SENT.value:
            pipeline.sent.append(p_response)
        elif status_val == ProposalStatusEnum.ACCEPTED.value:
            pipeline.accepted.append(p_response)
        elif status_val == ProposalStatusEnum.REJECTED.value:
            pipeline.rejected.append(p_response)
        elif status_val == ProposalStatusEnum.EXPIRED.value:
            pipeline.expired.append(p_response)

    return pipeline
