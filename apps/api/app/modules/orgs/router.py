from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.db.enums import RoleEnum
from app.db.models.user import User
from app.modules.orgs.schemas import OrgCreate, OrgUpdate, OrgResponse
from app.modules.orgs import service

router = APIRouter()


@router.get("/", response_model=List[OrgResponse])
def list_orgs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.GERENTE_LEGAL)),
):
    """List all organizations. Only GERENTE_LEGAL."""
    return service.list_organizations(db)


@router.get("/{org_id}", response_model=OrgResponse)
def get_org(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.GERENTE_LEGAL)),
):
    """Get organization by ID. Only GERENTE_LEGAL."""
    return service.get_organization(db, org_id)


@router.post("/", response_model=OrgResponse, status_code=201)
def create_org(
    data: OrgCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.GERENTE_LEGAL)),
):
    """Create a new organization. Only GERENTE_LEGAL."""
    return service.create_organization(db, data)


@router.patch("/{org_id}", response_model=OrgResponse)
def update_org(
    org_id: int,
    data: OrgUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleEnum.GERENTE_LEGAL)),
):
    """Update an organization. Only GERENTE_LEGAL."""
    return service.update_organization(db, org_id, data)
