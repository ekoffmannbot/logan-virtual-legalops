from typing import List, Optional

from fastapi import APIRouter, Depends, Query, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.contracts.schemas import (
    ContractCreate,
    ContractDetail,
    ContractListItem,
    ContractStats,
    ContractUpdate,
    TimelineEvent,
    TransitionRequest,
)
from app.modules.contracts import service

router = APIRouter()


# ── GET /contracts ───────────────────────────────────────────────

@router.get("/", response_model=List[ContractListItem])
def list_contracts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List contracts for the current organisation."""
    return service.list_contracts(
        db,
        org_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        status_filter=status,
        client_id=client_id,
    )


# ── GET /contracts/stats ─────────────────────────────────────────

@router.get("/stats", response_model=ContractStats)
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return aggregate contract counts by status bucket."""
    return service.get_stats(db, org_id=current_user.organization_id)


# ── GET /contracts/{contract_id} ─────────────────────────────────

@router.get("/{contract_id}", response_model=ContractDetail)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single contract by ID."""
    return service.get(db, contract_id, current_user.organization_id)


# ── GET /contracts/{contract_id}/timeline ─────────────────────────

@router.get("/{contract_id}/timeline", response_model=List[TimelineEvent])
def get_timeline(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return audit-log based timeline for the contract."""
    return service.get_timeline(
        db, contract_id, current_user.organization_id
    )


# ── POST /contracts ──────────────────────────────────────────────

@router.post("/", response_model=ContractDetail, status_code=201)
def create_contract(
    data: ContractCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new contract."""
    return service.create(db, data, current_user)


# ── PATCH /contracts/{contract_id} ───────────────────────────────

@router.patch("/{contract_id}", response_model=ContractDetail)
def update_contract(
    contract_id: int,
    data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partially update contract fields."""
    return service.update(
        db, contract_id, current_user.organization_id, data
    )


# ── POST /contracts/{contract_id}/transition ─────────────────────

@router.post("/{contract_id}/transition", response_model=ContractDetail)
def transition_contract(
    contract_id: int,
    body: TransitionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Execute a named workflow transition on the contract."""
    return service.transition(
        db,
        contract_id,
        current_user.organization_id,
        body.action,
        current_user,
    )


# ── POST /contracts/{contract_id}/upload-scan ────────────────────

@router.post("/{contract_id}/upload-scan", response_model=ContractDetail)
def upload_scan(
    contract_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a scanned document for the contract."""
    return service.upload_scan_file(
        db,
        contract_id,
        current_user.organization_id,
        file,
        current_user,
    )
