from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models import NotaryDocument, Client, Matter, User, Communication, AuditLog
from app.db.enums import (
    NotaryDocStatusEnum,
    NotaryDocTypeEnum,
    CommunicationChannelEnum,
    CommunicationDirectionEnum,
    CommunicationStatusEnum,
)
from app.modules.notary.schemas import (
    NotaryDocCreate,
    NotaryDocUpdate,
    ContactAttemptCreate,
)


# ------------------------------------------------------------------
# Status categories for /stats
# ------------------------------------------------------------------
PENDING_STATUSES = {
    NotaryDocStatusEnum.ANTECEDENTS_REQUESTED,
    NotaryDocStatusEnum.ANTECEDENTS_COMPLETE,
    NotaryDocStatusEnum.DRAFTING,
}

AT_NOTARY_STATUSES = {
    NotaryDocStatusEnum.SENT_TO_NOTARY,
    NotaryDocStatusEnum.NOTARY_RECEIVED,
    NotaryDocStatusEnum.NOTARY_SIGNED,
}

COMPLETED_STATUSES = {
    NotaryDocStatusEnum.ARCHIVED,
    NotaryDocStatusEnum.CLIENT_SIGNED,
    NotaryDocStatusEnum.RETRIEVED_BY_PROCURADOR,
}


# ------------------------------------------------------------------
# Action-string -> target status mapping for POST /transition
# ------------------------------------------------------------------
ACTION_TO_STATUS: dict[str, NotaryDocStatusEnum] = {
    "request_antecedents": NotaryDocStatusEnum.ANTECEDENTS_REQUESTED,
    "complete_antecedents": NotaryDocStatusEnum.ANTECEDENTS_COMPLETE,
    "start_drafting": NotaryDocStatusEnum.DRAFTING,
    "send_to_notary": NotaryDocStatusEnum.SENT_TO_NOTARY,
    "notary_received": NotaryDocStatusEnum.NOTARY_RECEIVED,
    "notary_signed": NotaryDocStatusEnum.NOTARY_SIGNED,
    "client_contact_pending": NotaryDocStatusEnum.CLIENT_CONTACT_PENDING,
    "document_available": NotaryDocStatusEnum.DOCUMENT_AVAILABLE,
    "client_signed": NotaryDocStatusEnum.CLIENT_SIGNED,
    "retrieved_by_procurador": NotaryDocStatusEnum.RETRIEVED_BY_PROCURADOR,
    "archive": NotaryDocStatusEnum.ARCHIVED,
    "report_to_manager": NotaryDocStatusEnum.REPORTED_TO_MANAGER,
}


# ------------------------------------------------------------------
# Allowed status transitions
# ------------------------------------------------------------------
ALLOWED_TRANSITIONS: dict[NotaryDocStatusEnum, list[NotaryDocStatusEnum]] = {
    NotaryDocStatusEnum.ANTECEDENTS_REQUESTED: [NotaryDocStatusEnum.ANTECEDENTS_COMPLETE],
    NotaryDocStatusEnum.ANTECEDENTS_COMPLETE: [NotaryDocStatusEnum.DRAFTING],
    NotaryDocStatusEnum.DRAFTING: [NotaryDocStatusEnum.SENT_TO_NOTARY],
    NotaryDocStatusEnum.SENT_TO_NOTARY: [NotaryDocStatusEnum.NOTARY_RECEIVED],
    NotaryDocStatusEnum.NOTARY_RECEIVED: [NotaryDocStatusEnum.NOTARY_SIGNED],
    NotaryDocStatusEnum.NOTARY_SIGNED: [NotaryDocStatusEnum.CLIENT_CONTACT_PENDING],
    NotaryDocStatusEnum.CLIENT_CONTACT_PENDING: [NotaryDocStatusEnum.DOCUMENT_AVAILABLE],
    NotaryDocStatusEnum.DOCUMENT_AVAILABLE: [NotaryDocStatusEnum.CLIENT_SIGNED],
    NotaryDocStatusEnum.CLIENT_SIGNED: [NotaryDocStatusEnum.RETRIEVED_BY_PROCURADOR],
    NotaryDocStatusEnum.RETRIEVED_BY_PROCURADOR: [
        NotaryDocStatusEnum.ARCHIVED,
        NotaryDocStatusEnum.REPORTED_TO_MANAGER,
    ],
    NotaryDocStatusEnum.ARCHIVED: [],
    NotaryDocStatusEnum.REPORTED_TO_MANAGER: [],
}


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------
def _validate_transition(
    current: NotaryDocStatusEnum, target: NotaryDocStatusEnum
) -> None:
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if target not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transicion no permitida: {current.value} -> {target.value}",
        )


def _get_doc_or_404(db: Session, doc_id: int, org_id: int) -> NotaryDocument:
    doc = (
        db.query(NotaryDocument)
        .filter(NotaryDocument.id == doc_id, NotaryDocument.organization_id == org_id)
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Documento notarial no encontrado",
        )
    return doc


def _resolve_client_name(db: Session, client_id: int) -> str:
    client = db.query(Client).filter(Client.id == client_id).first()
    return client.full_name_or_company if client else "Desconocido"


def _resolve_matter_title(db: Session, matter_id: Optional[int]) -> Optional[str]:
    if not matter_id:
        return None
    matter = db.query(Matter).filter(Matter.id == matter_id).first()
    return matter.title if matter else None


def _resolve_user_name(db: Session, user_id: Optional[int]) -> Optional[str]:
    if not user_id:
        return None
    user = db.query(User).filter(User.id == user_id).first()
    return user.full_name if user else None


def _doc_to_list_item(db: Session, doc: NotaryDocument) -> dict:
    """Convert a NotaryDocument ORM object to the dict shape expected by NotaryDocListItem."""
    return {
        "id": doc.id,
        "client_name": _resolve_client_name(db, doc.client_id),
        "document_type": doc.doc_type if isinstance(doc.doc_type, str) else doc.doc_type.value,
        "status": doc.status if isinstance(doc.status, str) else doc.status.value,
        "notary_office": doc.notary_name,
        "sent_at": doc.sent_at,
        "notary_signed_at": doc.notary_signed_at,
        "client_signed_at": doc.client_signed_at,
        "matter_id": doc.matter_id,
        "matter_title": _resolve_matter_title(db, doc.matter_id),
        "created_at": doc.created_at,
    }


def _doc_to_detail(db: Session, doc: NotaryDocument) -> dict:
    """Convert a NotaryDocument ORM object to the dict shape expected by NotaryDocDetail."""
    return {
        "id": doc.id,
        "client_name": _resolve_client_name(db, doc.client_id),
        "client_id": doc.client_id,
        "matter_id": doc.matter_id,
        "matter_title": _resolve_matter_title(db, doc.matter_id),
        "document_type": doc.doc_type if isinstance(doc.doc_type, str) else doc.doc_type.value,
        "status": doc.status if isinstance(doc.status, str) else doc.status.value,
        "notary_office": doc.notary_name,
        "notary_contact": None,  # model has no notary_contact column; expose as null
        "sent_at": doc.sent_at,
        "notary_signed_at": doc.notary_signed_at,
        "client_signed_at": doc.client_signed_at,
        "notes": doc.notes,
        "created_at": doc.created_at,
        "updated_at": doc.updated_at,
    }


# ------------------------------------------------------------------
# Public service functions
# ------------------------------------------------------------------

def list_docs(
    db: Session,
    org_id: int,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
) -> List[dict]:
    """Return list of notary documents for the organisation (GET /notary)."""
    query = db.query(NotaryDocument).filter(NotaryDocument.organization_id == org_id)
    if status_filter:
        query = query.filter(NotaryDocument.status == status_filter)
    if client_id:
        query = query.filter(NotaryDocument.client_id == client_id)
    docs = (
        query.order_by(NotaryDocument.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_doc_to_list_item(db, doc) for doc in docs]


def get_detail(db: Session, doc_id: int, org_id: int) -> dict:
    """Return a single notary document detail (GET /notary/{id})."""
    doc = _get_doc_or_404(db, doc_id, org_id)
    return _doc_to_detail(db, doc)


def get_stats(db: Session, org_id: int) -> dict:
    """Return aggregated stats (GET /notary/stats)."""
    docs = (
        db.query(NotaryDocument)
        .filter(NotaryDocument.organization_id == org_id)
        .all()
    )
    total = len(docs)
    pending = sum(
        1 for d in docs
        if (d.status if isinstance(d.status, str) else d.status.value)
        in {s.value for s in PENDING_STATUSES}
    )
    at_notary = sum(
        1 for d in docs
        if (d.status if isinstance(d.status, str) else d.status.value)
        in {s.value for s in AT_NOTARY_STATUSES}
    )
    completed = sum(
        1 for d in docs
        if (d.status if isinstance(d.status, str) else d.status.value)
        in {s.value for s in COMPLETED_STATUSES}
    )
    return {
        "total": total,
        "pending": pending,
        "at_notary": at_notary,
        "completed": completed,
    }


def get_timeline(db: Session, doc_id: int, org_id: int) -> List[dict]:
    """Return timeline events from AuditLog (GET /notary/{id}/timeline)."""
    # Ensure doc exists & belongs to org
    _get_doc_or_404(db, doc_id, org_id)

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "notary_document",
            AuditLog.entity_id == doc_id,
            AuditLog.organization_id == org_id,
        )
        .order_by(AuditLog.created_at.desc())
        .all()
    )
    result = []
    for log in logs:
        # Build a human-readable description from after_json if available
        description = None
        if log.after_json:
            description = ", ".join(
                f"{k}: {v}" for k, v in log.after_json.items()
            )
        result.append(
            {
                "id": log.id,
                "action": log.action,
                "description": description,
                "user_name": _resolve_user_name(db, log.actor_user_id),
                "created_at": log.created_at,
            }
        )
    return result


def get_contact_attempts(db: Session, doc_id: int, org_id: int) -> List[dict]:
    """Return contact attempts from Communication records (GET /notary/{id}/contact-attempts)."""
    _get_doc_or_404(db, doc_id, org_id)

    comms = (
        db.query(Communication)
        .filter(
            Communication.entity_type == "notary_document",
            Communication.entity_id == doc_id,
            Communication.organization_id == org_id,
        )
        .order_by(Communication.created_at.desc())
        .all()
    )
    result = []
    for comm in comms:
        result.append(
            {
                "id": comm.id,
                "type": comm.channel if isinstance(comm.channel, str) else comm.channel.value,
                "description": comm.body_text or comm.subject or "",
                "outcome": comm.status if isinstance(comm.status, str) else comm.status.value,
                "user_name": _resolve_user_name(db, comm.created_by_user_id),
                "created_at": comm.created_at,
            }
        )
    return result


def transition(
    db: Session,
    doc_id: int,
    org_id: int,
    action: str,
    current_user: User,
) -> dict:
    """Execute a status transition by action name (POST /notary/{id}/transition)."""
    target_status = ACTION_TO_STATUS.get(action)
    if target_status is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Accion desconocida: {action}",
        )

    doc = _get_doc_or_404(db, doc_id, org_id)
    current_status = NotaryDocStatusEnum(doc.status) if isinstance(doc.status, str) else doc.status
    _validate_transition(current_status, target_status)

    old_status_value = current_status.value
    doc.status = target_status

    # Side-effects based on target status
    now = datetime.now(timezone.utc)
    if target_status == NotaryDocStatusEnum.SENT_TO_NOTARY:
        doc.sent_at = now
    elif target_status == NotaryDocStatusEnum.NOTARY_SIGNED:
        doc.notary_signed_at = now
    elif target_status == NotaryDocStatusEnum.CLIENT_SIGNED:
        doc.client_signed_at = now
    elif target_status == NotaryDocStatusEnum.ARCHIVED:
        doc.archived_at = now

    # Create audit log entry for the transition
    audit = AuditLog(
        organization_id=org_id,
        actor_user_id=current_user.id,
        action=f"status_transition:{action}",
        entity_type="notary_document",
        entity_id=doc.id,
        before_json={"status": old_status_value},
        after_json={"status": target_status.value},
    )
    db.add(audit)

    db.commit()
    db.refresh(doc)
    return _doc_to_detail(db, doc)


def create_contact_attempt(
    db: Session,
    doc_id: int,
    org_id: int,
    data: ContactAttemptCreate,
    current_user: User,
) -> dict:
    """Create a contact attempt / communication (POST /notary/{id}/contact-attempts)."""
    _get_doc_or_404(db, doc_id, org_id)

    comm = Communication(
        organization_id=org_id,
        entity_type="notary_document",
        entity_id=doc_id,
        channel=data.type,
        direction=CommunicationDirectionEnum.OUTBOUND.value,
        body_text=data.description,
        status=data.outcome or CommunicationStatusEnum.LOGGED.value,
        created_by_user_id=current_user.id,
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)

    return {
        "id": comm.id,
        "type": comm.channel if isinstance(comm.channel, str) else comm.channel.value,
        "description": comm.body_text or "",
        "outcome": comm.status if isinstance(comm.status, str) else comm.status.value,
        "user_name": current_user.full_name,
        "created_at": comm.created_at,
    }


# ------------------------------------------------------------------
# Legacy CRUD kept for backwards compatibility (create / update)
# ------------------------------------------------------------------
def create(db: Session, data: NotaryDocCreate, current_user: User) -> dict:
    """Create a new notary document in ANTECEDENTS_REQUESTED status."""
    doc = NotaryDocument(
        organization_id=current_user.organization_id,
        client_id=data.client_id,
        matter_id=data.matter_id,
        doc_type=data.doc_type,
        status=NotaryDocStatusEnum.ANTECEDENTS_REQUESTED,
        notary_name=data.notary_name,
        notes=data.notes,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _doc_to_detail(db, doc)


def update(
    db: Session, doc_id: int, org_id: int, data: NotaryDocUpdate
) -> dict:
    """Partially update notary document fields."""
    doc = _get_doc_or_404(db, doc_id, org_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(doc, field, value)
    db.commit()
    db.refresh(doc)
    return _doc_to_detail(db, doc)
