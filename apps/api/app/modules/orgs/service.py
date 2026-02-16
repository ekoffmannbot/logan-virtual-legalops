from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.models.organization import Organization
from app.modules.orgs.schemas import OrgCreate, OrgUpdate


def create_organization(db: Session, data: OrgCreate) -> Organization:
    """Create a new organization."""
    org = Organization(
        name=data.name,
        timezone=data.timezone,
    )
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


def get_organization(db: Session, org_id: int) -> Organization:
    """Get a single organization by ID."""
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organización no encontrada",
        )
    return org


def list_organizations(db: Session) -> List[Organization]:
    """Return all organizations."""
    return db.query(Organization).order_by(Organization.id).all()


def update_organization(
    db: Session, org_id: int, data: OrgUpdate
) -> Organization:
    """Partially update an organization."""
    org = get_organization(db, org_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(org, field, value)
    db.commit()
    db.refresh(org)
    return org
