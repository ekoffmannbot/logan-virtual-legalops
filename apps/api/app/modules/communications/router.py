from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.communications.schemas import (
    CommunicationCreate,
    CommunicationResponse,
    CommunicationListResponse,
)
from app.modules.communications import service

router = APIRouter()


@router.post("/", response_model=CommunicationResponse, status_code=201)
def log_communication(
    data: CommunicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Log a new communication (phone, email, whatsapp, in_person)."""
    return service.log_communication(db, data, current_user)


@router.get("/", response_model=CommunicationListResponse)
def list_communications(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    channel: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List communications with optional filters.
    If entity_type and entity_id are both provided, filters to that entity.
    """
    if entity_type and entity_id:
        return service.list_by_entity(
            db,
            org_id=current_user.organization_id,
            entity_type=entity_type,
            entity_id=entity_id,
            skip=skip,
            limit=limit,
        )
    return service.list_all(
        db,
        org_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        entity_type=entity_type,
        entity_id=entity_id,
        channel=channel,
        direction=direction,
    )
