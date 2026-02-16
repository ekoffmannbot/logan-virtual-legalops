from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import or_, func
from sqlalchemy.orm import Session

from app.db.models.client import Client
from app.db.models.matter import Matter
from app.db.models.document import Document
from app.db.models.communication import Communication
from app.modules.clients.schemas import (
    ClientCreate,
    ClientUpdate,
    Client360Response,
    ClientResponse,
    MatterSummary,
    DocumentSummary,
    CommunicationSummary,
)


def _client_to_response(client: Client) -> dict:
    """Map a Client ORM object to the dict expected by ClientResponse (full_name)."""
    return {
        "id": client.id,
        "full_name": client.full_name_or_company,
        "rut": client.rut,
        "email": client.email,
        "phone": client.phone,
        "created_at": client.created_at,
    }


def create_client(db: Session, data: ClientCreate, organization_id: int) -> dict:
    """Create a new client."""
    client = Client(
        organization_id=organization_id,
        full_name_or_company=data.full_name,
        rut=data.rut,
        email=data.email,
        phone=data.phone,
        address=data.address,
        notes=data.notes,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return _client_to_response(client)


def list_clients(
    db: Session,
    organization_id: int,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[dict], int]:
    """List clients filtered by organization, optionally searching by name or RUT."""
    query = db.query(Client).filter(Client.organization_id == organization_id)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                Client.full_name_or_company.ilike(pattern),
                Client.rut.ilike(pattern),
            )
        )
    total = query.count()
    items = query.order_by(Client.created_at.desc()).offset(skip).limit(limit).all()
    return [_client_to_response(c) for c in items], total


def get_client(db: Session, client_id: int, organization_id: int) -> Client:
    """Get a single client scoped to the organization."""
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.organization_id == organization_id)
        .first()
    )
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado",
        )
    return client


def get_client_response(db: Session, client_id: int, organization_id: int) -> dict:
    """Get a single client as a response dict."""
    client = get_client(db, client_id, organization_id)
    return _client_to_response(client)


def update_client(
    db: Session, client_id: int, organization_id: int, data: ClientUpdate
) -> dict:
    """Partially update a client."""
    client = get_client(db, client_id, organization_id)
    update_data = data.model_dump(exclude_unset=True)
    # Map full_name -> full_name_or_company for the ORM model
    if "full_name" in update_data:
        update_data["full_name_or_company"] = update_data.pop("full_name")
    for field, value in update_data.items():
        setattr(client, field, value)
    db.commit()
    db.refresh(client)
    return _client_to_response(client)


def get_360_view(
    db: Session, client_id: int, organization_id: int
) -> Client360Response:
    """Build a 360-degree view of the client with matters, documents, and communications."""
    client = get_client(db, client_id, organization_id)

    # Recent matters (last 20)
    recent_matters = (
        db.query(Matter)
        .filter(
            Matter.client_id == client_id,
            Matter.organization_id == organization_id,
        )
        .order_by(Matter.created_at.desc())
        .limit(20)
        .all()
    )

    # Gather matter IDs for document lookup
    matter_ids = [m.id for m in recent_matters]

    # Documents linked to this client via entity_type='client' OR to any of the client's matters
    doc_filters = [
        (Document.entity_type == "client") & (Document.entity_id == client_id),
    ]
    if matter_ids:
        doc_filters.append(
            (Document.entity_type == "matter") & (Document.entity_id.in_(matter_ids))
        )

    documents = (
        db.query(Document)
        .filter(
            Document.organization_id == organization_id,
            or_(*doc_filters),
        )
        .order_by(Document.created_at.desc())
        .limit(50)
        .all()
    )

    # Communications linked to this client via entity_type='client'
    communications = (
        db.query(Communication)
        .filter(
            Communication.entity_type == "client",
            Communication.entity_id == client_id,
            Communication.organization_id == organization_id,
        )
        .order_by(Communication.created_at.desc())
        .limit(50)
        .all()
    )

    return Client360Response(
        id=client.id,
        full_name=client.full_name_or_company,
        rut=client.rut,
        email=client.email,
        phone=client.phone,
        address=client.address,
        created_at=client.created_at,
        matters=[MatterSummary.model_validate(m) for m in recent_matters],
        documents=[
            DocumentSummary(
                id=d.id,
                filename=d.file_name,
                doc_type=d.doc_type if isinstance(d.doc_type, str) else d.doc_type.value,
                uploaded_at=d.created_at,
            )
            for d in documents
        ],
        communications=[
            CommunicationSummary(
                id=c.id,
                channel=c.channel if isinstance(c.channel, str) else c.channel.value,
                subject=c.subject,
                snippet=(c.body_text[:200] if c.body_text else None),
                sent_at=c.created_at,
                direction=c.direction if isinstance(c.direction, str) else c.direction.value,
            )
            for c in communications
        ],
    )
