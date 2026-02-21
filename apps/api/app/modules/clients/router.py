from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.clients.schemas import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientListResponse,
    Client360Response,
)
from app.modules.clients import service

router = APIRouter()


@router.get("/")
def list_clients(
    search: Optional[str] = Query(None, description="Search by name or RUT"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List clients in the current organization with optional search.
    Returns a plain array (frontend expects Client[]).
    """
    items, total = service.list_clients(
        db, current_user.organization_id, search, skip, limit
    )
    return items


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single client by ID."""
    return service.get_client_response(db, client_id, current_user.organization_id)


@router.post("/", response_model=ClientResponse, status_code=201)
def create_client(
    data: ClientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client."""
    return service.create_client(db, data, current_user.organization_id)


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update a client."""
    return service.update_client(db, client_id, current_user.organization_id, data)


@router.get("/{client_id}/360", response_model=Client360Response)
def client_360(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get 360-degree view of a client (matters, documents, communications)."""
    return service.get_360_view(db, client_id, current_user.organization_id)
