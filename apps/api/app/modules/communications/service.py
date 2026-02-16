from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.enums import CommunicationStatusEnum
from app.db.models.communication import Communication
from app.db.models.user import User
from app.modules.communications.schemas import CommunicationCreate


def log_communication(
    db: Session, data: CommunicationCreate, current_user: User
) -> Communication:
    """Log a new communication record."""
    comm = Communication(
        organization_id=current_user.organization_id,
        entity_type=data.entity_type,
        entity_id=data.entity_id,
        channel=data.channel,
        direction=data.direction,
        subject=data.subject,
        body_text=data.body_text,
        from_value=data.from_value,
        to_value=data.to_value,
        status=CommunicationStatusEnum.LOGGED,
        created_by_user_id=current_user.id,
    )
    db.add(comm)
    db.commit()
    db.refresh(comm)
    return comm


def list_by_entity(
    db: Session,
    org_id: int,
    entity_type: str,
    entity_id: int,
    skip: int = 0,
    limit: int = 50,
) -> dict:
    """Return communications for a specific entity (client, matter, etc.)."""
    query = (
        db.query(Communication)
        .filter(
            Communication.organization_id == org_id,
            Communication.entity_type == entity_type,
            Communication.entity_id == entity_id,
        )
    )
    total = query.count()
    items = (
        query.order_by(Communication.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": items, "total": total}


def list_all(
    db: Session,
    org_id: int,
    skip: int = 0,
    limit: int = 50,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    channel: Optional[str] = None,
    direction: Optional[str] = None,
) -> dict:
    """Return paginated list of all communications with optional filters."""
    query = db.query(Communication).filter(Communication.organization_id == org_id)

    if entity_type:
        query = query.filter(Communication.entity_type == entity_type)
    if entity_id:
        query = query.filter(Communication.entity_id == entity_id)
    if channel:
        query = query.filter(Communication.channel == channel)
    if direction:
        query = query.filter(Communication.direction == direction)

    total = query.count()
    items = (
        query.order_by(Communication.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {"items": items, "total": total}
