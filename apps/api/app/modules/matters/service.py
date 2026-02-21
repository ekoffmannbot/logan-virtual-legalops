from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.enums import DeadlineStatusEnum, MatterStatusEnum
from app.db.models import (
    AuditLog,
    Client,
    Communication,
    CourtAction,
    Deadline,
    Document,
    Matter,
    Task,
    User,
)
from app.modules.matters.schemas import (
    CommunicationItem,
    DeadlineItem,
    DocumentItem,
    GestionItem,
    MatterCreate,
    MatterDetailResponse,
    MatterResponse,
    MatterUpdate,
    TaskItem,
    TimelineEvent,
)


# ── helpers ──────────────────────────────────────────────────────

def _enum_val(v: Any) -> str:
    """Safely extract .value from an enum or return the string as-is."""
    return v.value if hasattr(v, "value") else str(v)


def _matter_to_response(matter: Matter, db: Session) -> MatterResponse:
    """Convert a Matter ORM object to the flat list response the frontend expects."""
    # Resolve client name
    client = db.query(Client.full_name_or_company).filter(Client.id == matter.client_id).scalar()

    # Resolve assigned lawyer name
    lawyer_name: Optional[str] = None
    if matter.assigned_lawyer_id:
        lawyer_name = (
            db.query(User.full_name)
            .filter(User.id == matter.assigned_lawyer_id)
            .scalar()
        )

    mt = _enum_val(matter.matter_type)
    return MatterResponse(
        id=matter.id,
        title=matter.title,
        client_name=client or "—",
        client_id=matter.client_id,
        matter_type=mt,
        type=mt,  # frontend alias
        status=_enum_val(matter.status),
        assigned_lawyer_name=lawyer_name,
        assigned_to_name=lawyer_name,  # frontend alias
        court=getattr(matter, "court_name", None),
        rol=getattr(matter, "rol_number", None),
        next_hearing_date=None,  # TODO: compute from upcoming Deadline
        last_movement_at=matter.updated_at,
        created_at=matter.created_at,
    )


# ── CRUD ─────────────────────────────────────────────────────────

def create_matter(
    db: Session, data: MatterCreate, organization_id: int
) -> MatterResponse:
    """Create a new matter (causa)."""
    matter = Matter(
        organization_id=organization_id,
        client_id=data.client_id,
        matter_type=data.matter_type,
        title=data.title,
        description=data.description,
        status=MatterStatusEnum.OPEN,
        opened_at=datetime.now(timezone.utc),
    )
    db.add(matter)
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter, db)


def list_matters(
    db: Session,
    organization_id: int,
    status_filter: Optional[str] = None,
    matter_type: Optional[str] = None,
    lawyer_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[MatterResponse], int]:
    """List matters with org + optional status/type/lawyer filters."""
    query = db.query(Matter).filter(Matter.organization_id == organization_id)
    if status_filter:
        query = query.filter(Matter.status == status_filter)
    if matter_type:
        query = query.filter(Matter.matter_type == matter_type)
    if lawyer_id:
        query = query.filter(Matter.assigned_lawyer_id == lawyer_id)

    total = query.count()
    rows = query.order_by(Matter.created_at.desc()).offset(skip).limit(limit).all()

    items = [_matter_to_response(m, db) for m in rows]
    return items, total


# ── single matter (detail) ───────────────────────────────────────

def get_matter(db: Session, matter_id: int, organization_id: int) -> Matter:
    """Get a single matter ORM object scoped to the organization."""
    matter = (
        db.query(Matter)
        .filter(Matter.id == matter_id, Matter.organization_id == organization_id)
        .first()
    )
    if not matter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Causa no encontrada",
        )
    return matter


def get_matter_detail(
    db: Session, matter_id: int, organization_id: int
) -> MatterDetailResponse:
    """Build the full detail response for a single matter."""
    matter = get_matter(db, matter_id, organization_id)

    # -- Resolve names ------------------------------------------------
    client_name = (
        db.query(Client.full_name_or_company)
        .filter(Client.id == matter.client_id)
        .scalar()
    ) or "—"

    lawyer_name: Optional[str] = None
    if matter.assigned_lawyer_id:
        lawyer_name = (
            db.query(User.full_name)
            .filter(User.id == matter.assigned_lawyer_id)
            .scalar()
        )

    # -- Deadlines -----------------------------------------------------
    deadline_rows = (
        db.query(Deadline)
        .filter(Deadline.matter_id == matter_id)
        .order_by(Deadline.due_at.asc())
        .all()
    )
    deadlines = [
        DeadlineItem(
            id=d.id,
            title=d.title,
            due_date=d.due_at,
            severity=_enum_val(d.severity),
            completed=_enum_val(d.status) == DeadlineStatusEnum.HANDLED.value,
        )
        for d in deadline_rows
    ]

    # -- Gestiones (court actions) -------------------------------------
    court_action_rows = (
        db.query(CourtAction)
        .filter(CourtAction.matter_id == matter_id)
        .order_by(CourtAction.created_at.desc())
        .all()
    )
    gestiones = [
        GestionItem(
            id=ca.id,
            title=ca.action_type,
            gestion_type=_enum_val(ca.method),
            date=ca.sent_at,
            result=_enum_val(ca.status),
        )
        for ca in court_action_rows
    ]

    # -- Documents -----------------------------------------------------
    doc_rows = (
        db.query(Document)
        .filter(
            Document.entity_type == "matter",
            Document.entity_id == matter_id,
        )
        .order_by(Document.created_at.desc())
        .all()
    )
    documents = [
        DocumentItem(
            id=doc.id,
            filename=doc.file_name,
            doc_type=_enum_val(doc.doc_type),
            uploaded_at=doc.created_at,
        )
        for doc in doc_rows
    ]

    # -- Tasks ---------------------------------------------------------
    task_rows = (
        db.query(Task)
        .filter(
            Task.entity_type == "matter",
            Task.entity_id == matter_id,
        )
        .order_by(Task.created_at.desc())
        .all()
    )
    tasks: List[TaskItem] = []
    for t in task_rows:
        assignee_name: Optional[str] = None
        if t.assigned_to_user_id:
            assignee_name = (
                db.query(User.full_name)
                .filter(User.id == t.assigned_to_user_id)
                .scalar()
            )
        tasks.append(
            TaskItem(
                id=t.id,
                title=t.title,
                status=_enum_val(t.status),
                due_date=t.due_at,
                assigned_to_name=assignee_name,
            )
        )

    # -- Communications ------------------------------------------------
    comm_rows = (
        db.query(Communication)
        .filter(
            Communication.entity_type == "matter",
            Communication.entity_id == matter_id,
        )
        .order_by(Communication.created_at.desc())
        .all()
    )
    communications = [
        CommunicationItem(
            id=c.id,
            channel=_enum_val(c.channel),
            subject=c.subject,
            snippet=(c.body_text[:120] + "...") if c.body_text and len(c.body_text) > 120 else c.body_text,
            sent_at=c.created_at,
            direction=_enum_val(c.direction),
        )
        for c in comm_rows
    ]

    # -- Timeline (audit logs + communications) ------------------------
    timeline: List[TimelineEvent] = []

    audit_logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "matter",
            AuditLog.entity_id == matter_id,
            AuditLog.organization_id == organization_id,
        )
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    for log in audit_logs:
        actor_name: Optional[str] = None
        if log.actor_user_id:
            actor_name = (
                db.query(User.full_name)
                .filter(User.id == log.actor_user_id)
                .scalar()
            )
        timeline.append(
            TimelineEvent(
                id=log.id,
                title=f"Acción: {log.action}",
                description=None,
                timestamp=log.created_at,
                type="audit_log",
                actor=actor_name,
            )
        )

    for c in comm_rows:
        creator_name: Optional[str] = None
        if c.created_by_user_id:
            creator_name = (
                db.query(User.full_name)
                .filter(User.id == c.created_by_user_id)
                .scalar()
            )
        timeline.append(
            TimelineEvent(
                id=c.id,
                title=f"{_enum_val(c.channel)} ({_enum_val(c.direction)})",
                description=c.subject,
                timestamp=c.created_at,
                type="communication",
                actor=creator_name,
            )
        )

    # Sort timeline newest-first
    timeline.sort(key=lambda e: e.timestamp, reverse=True)

    return MatterDetailResponse(
        id=matter.id,
        title=matter.title,
        description=matter.description,
        client_id=matter.client_id,
        client_name=client_name,
        matter_type=_enum_val(matter.matter_type),
        status=_enum_val(matter.status),
        assigned_lawyer_name=lawyer_name,
        rit=matter.rol_number,
        court=matter.court_name,
        created_at=matter.created_at,
        updated_at=matter.updated_at,
        deadlines=deadlines,
        gestiones=gestiones,
        documents=documents,
        tasks=tasks,
        communications=communications,
        timeline=timeline,
    )


# ── update ───────────────────────────────────────────────────────

def update_matter(
    db: Session, matter_id: int, organization_id: int, data: MatterUpdate
) -> MatterResponse:
    """Partially update a matter."""
    matter = get_matter(db, matter_id, organization_id)
    update_data = data.model_dump(exclude_unset=True)

    # If closing the matter, set closed_at
    if "status" in update_data and update_data["status"] in (
        MatterStatusEnum.CLOSED.value,
        MatterStatusEnum.TERMINATED.value,
    ):
        matter.closed_at = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(matter, field, value)
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter, db)


# ── transition ───────────────────────────────────────────────────

_VALID_TRANSITIONS: Dict[str, MatterStatusEnum] = {
    "open": MatterStatusEnum.OPEN,
    "closed": MatterStatusEnum.CLOSED,
    "suspended_nonpayment": MatterStatusEnum.SUSPENDED_NONPAYMENT,
    "terminated": MatterStatusEnum.TERMINATED,
}


def transition_matter(
    db: Session, matter_id: int, organization_id: int, action: str
) -> MatterResponse:
    """Transition a matter to a new status via named action."""
    target = _VALID_TRANSITIONS.get(action)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción inválida: {action}. Valores permitidos: {', '.join(_VALID_TRANSITIONS.keys())}",
        )

    matter = get_matter(db, matter_id, organization_id)

    # Set closed_at when closing / terminating
    if target in (MatterStatusEnum.CLOSED, MatterStatusEnum.TERMINATED):
        matter.closed_at = datetime.now(timezone.utc)
    elif target == MatterStatusEnum.OPEN:
        matter.closed_at = None

    matter.status = target
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter, db)


# ── assign lawyer / procurador ───────────────────────────────────

def assign_lawyer(
    db: Session, matter_id: int, organization_id: int, user_id: int
) -> MatterResponse:
    """Assign a lawyer to the matter."""
    matter = get_matter(db, matter_id, organization_id)
    user = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == organization_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Abogado no encontrado en esta organización",
        )
    matter.assigned_lawyer_id = user_id
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter, db)


def assign_procurador(
    db: Session, matter_id: int, organization_id: int, user_id: int
) -> MatterResponse:
    """Assign a procurador to the matter."""
    matter = get_matter(db, matter_id, organization_id)
    user = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == organization_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Procurador no encontrado en esta organización",
        )
    matter.assigned_procurador_id = user_id
    db.commit()
    db.refresh(matter)
    return _matter_to_response(matter, db)
