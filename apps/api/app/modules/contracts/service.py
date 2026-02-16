from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.enums import (
    ContractStatusEnum,
    DocumentStatusEnum,
    DocumentTypeEnum,
    RoleEnum,
    TaskStatusEnum,
    TaskTypeEnum,
)
from app.db.models import AuditLog, Client, Contract, Document, Matter, User
from app.db.models.task import Task
from app.core.storage import get_storage
from app.modules.contracts.schemas import ContractCreate, ContractUpdate


# ------------------------------------------------------------------
# Action → (from_status, to_status) mapping
# ------------------------------------------------------------------
ACTION_TRANSITIONS: dict[str, tuple[ContractStatusEnum, ContractStatusEnum]] = {
    "submit_for_review": (
        ContractStatusEnum.DRAFTING,
        ContractStatusEnum.PENDING_REVIEW,
    ),
    "approve": (
        ContractStatusEnum.PENDING_REVIEW,
        ContractStatusEnum.APPROVED,
    ),
    "request_changes": (
        ContractStatusEnum.PENDING_REVIEW,
        ContractStatusEnum.CHANGES_REQUESTED,
    ),
    "upload_for_signing": (
        ContractStatusEnum.APPROVED,
        ContractStatusEnum.UPLOADED_FOR_SIGNING,
    ),
    "mark_signed": (
        ContractStatusEnum.UPLOADED_FOR_SIGNING,
        ContractStatusEnum.SIGNED,
    ),
    "upload_scan": (
        ContractStatusEnum.SIGNED,
        ContractStatusEnum.SCANNED_UPLOADED,
    ),
    "complete": (
        ContractStatusEnum.SCANNED_UPLOADED,
        ContractStatusEnum.COMPLETE,
    ),
}


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------

def _get_contract_or_404(db: Session, contract_id: int, org_id: int) -> Contract:
    contract = (
        db.query(Contract)
        .filter(Contract.id == contract_id, Contract.organization_id == org_id)
        .first()
    )
    if not contract:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contrato no encontrado",
        )
    return contract


def _user_full_name(db: Session, user_id: Optional[int]) -> Optional[str]:
    if user_id is None:
        return None
    user = db.query(User.full_name).filter(User.id == user_id).first()
    return user[0] if user else None


def _client_name(db: Session, client_id: int) -> Optional[str]:
    client = (
        db.query(Client.full_name_or_company)
        .filter(Client.id == client_id)
        .first()
    )
    return client[0] if client else None


def _matter_title(db: Session, matter_id: Optional[int]) -> Optional[str]:
    if matter_id is None:
        return None
    matter = db.query(Matter.title).filter(Matter.id == matter_id).first()
    return matter[0] if matter else None


def _scanned_document_url(db: Session, contract_id: int) -> Optional[str]:
    """Return the storage_path of the latest scanned document for this contract."""
    doc = (
        db.query(Document.storage_path)
        .filter(
            Document.entity_type == "contract",
            Document.entity_id == contract_id,
        )
        .order_by(Document.created_at.desc())
        .first()
    )
    return doc[0] if doc else None


def _build_list_item(db: Session, c: Contract) -> dict:
    return {
        "id": c.id,
        "client_name": _client_name(db, c.client_id),
        "status": c.status.value if hasattr(c.status, "value") else c.status,
        "drafted_by": _user_full_name(db, c.drafted_by_user_id),
        "reviewed_by": _user_full_name(db, c.reviewed_by_user_id),
        "signed": c.signed_at is not None,
        "signed_at": c.signed_at,
        "created_at": c.created_at,
        "matter_id": c.matter_id,
        "matter_title": _matter_title(db, c.matter_id),
    }


def _build_detail(db: Session, c: Contract) -> dict:
    return {
        "id": c.id,
        "client_name": _client_name(db, c.client_id),
        "client_id": c.client_id,
        "matter_id": c.matter_id,
        "matter_title": _matter_title(db, c.matter_id),
        "status": c.status.value if hasattr(c.status, "value") else c.status,
        "drafted_by": _user_full_name(db, c.drafted_by_user_id),
        "reviewed_by": _user_full_name(db, c.reviewed_by_user_id),
        "signed": c.signed_at is not None,
        "signed_at": c.signed_at,
        "scanned_document_url": _scanned_document_url(db, c.id),
        "content": c.notes,  # notes doubles as content for the frontend
        "notes": c.notes,
        "created_at": c.created_at,
        "updated_at": c.updated_at,
    }


def _create_admin_task(
    db: Session, contract: Contract, org_id: int, title: str
) -> Task:
    """Create a task assigned to the ADMINISTRACION role."""
    task = Task(
        organization_id=org_id,
        title=title,
        description=f"Contrato #{contract.id} - Cliente #{contract.client_id}",
        entity_type="contract",
        entity_id=contract.id,
        task_type=TaskTypeEnum.REVIEW_CONTRACT,
        status=TaskStatusEnum.OPEN,
        assigned_role=RoleEnum.ADMINISTRACION.value,
    )
    db.add(task)
    return task


def _log_audit(
    db: Session,
    contract: Contract,
    action: str,
    user: User,
    description: Optional[str] = None,
) -> AuditLog:
    """Write an audit-log entry for the contract."""
    log = AuditLog(
        organization_id=user.organization_id,
        actor_user_id=user.id,
        action=action,
        entity_type="contract",
        entity_id=contract.id,
        after_json={"description": description} if description else None,
    )
    db.add(log)
    return log


# ------------------------------------------------------------------
# Public API  –  list / get / stats
# ------------------------------------------------------------------

def list_contracts(
    db: Session,
    org_id: int,
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None,
    client_id: Optional[int] = None,
) -> List[dict]:
    """Return a flat list of contract dicts for the organisation."""
    query = db.query(Contract).filter(Contract.organization_id == org_id)
    if status_filter:
        query = query.filter(Contract.status == status_filter)
    if client_id:
        query = query.filter(Contract.client_id == client_id)
    contracts = query.order_by(Contract.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_list_item(db, c) for c in contracts]


def get(db: Session, contract_id: int, org_id: int) -> dict:
    """Return full contract detail dict."""
    contract = _get_contract_or_404(db, contract_id, org_id)
    return _build_detail(db, contract)


def get_stats(db: Session, org_id: int) -> dict:
    """Return aggregate contract counts by status bucket."""
    rows = (
        db.query(Contract.status, func.count(Contract.id))
        .filter(Contract.organization_id == org_id)
        .group_by(Contract.status)
        .all()
    )
    counts: dict[str, int] = {}
    for s, cnt in rows:
        key = s.value if hasattr(s, "value") else s
        counts[key] = cnt

    total = sum(counts.values())
    draft = counts.get(ContractStatusEnum.DRAFTING.value, 0) + counts.get(
        ContractStatusEnum.PENDING_DATA.value, 0
    )
    in_review = counts.get(ContractStatusEnum.PENDING_REVIEW.value, 0) + counts.get(
        ContractStatusEnum.CHANGES_REQUESTED.value, 0
    )
    signed = counts.get(ContractStatusEnum.SIGNED.value, 0) + counts.get(
        ContractStatusEnum.SCANNED_UPLOADED.value, 0
    ) + counts.get(ContractStatusEnum.COMPLETE.value, 0)
    pending_signature = counts.get(ContractStatusEnum.APPROVED.value, 0) + counts.get(
        ContractStatusEnum.UPLOADED_FOR_SIGNING.value, 0
    )

    return {
        "total": total,
        "draft": draft,
        "in_review": in_review,
        "signed": signed,
        "pending_signature": pending_signature,
    }


# ------------------------------------------------------------------
# Timeline
# ------------------------------------------------------------------

def get_timeline(db: Session, contract_id: int, org_id: int) -> List[dict]:
    """Return audit-log entries for a given contract as timeline events."""
    _get_contract_or_404(db, contract_id, org_id)  # ensure access

    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.entity_type == "contract",
            AuditLog.entity_id == contract_id,
            AuditLog.organization_id == org_id,
        )
        .order_by(AuditLog.created_at.desc())
        .all()
    )

    events: List[dict] = []
    for log in logs:
        user_name = _user_full_name(db, log.actor_user_id)
        description = None
        if log.after_json and isinstance(log.after_json, dict):
            description = log.after_json.get("description")
        events.append(
            {
                "id": log.id,
                "action": log.action,
                "description": description,
                "user_name": user_name,
                "created_at": log.created_at,
            }
        )
    return events


# ------------------------------------------------------------------
# CRUD  –  create / update
# ------------------------------------------------------------------

def create(db: Session, data: ContractCreate, current_user: User) -> dict:
    """Create a new contract in PENDING_DATA status."""
    contract = Contract(
        organization_id=current_user.organization_id,
        client_id=data.client_id,
        matter_id=data.matter_id,
        status=ContractStatusEnum.PENDING_DATA,
        notes=data.notes,
    )
    db.add(contract)
    db.commit()
    db.refresh(contract)

    _log_audit(db, contract, "contract_created", current_user, "Contrato creado")
    db.commit()

    return _build_detail(db, contract)


def update(
    db: Session, contract_id: int, org_id: int, data: ContractUpdate
) -> dict:
    """Partially update contract fields (notes, assignees)."""
    contract = _get_contract_or_404(db, contract_id, org_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contract, field, value)
    db.commit()
    db.refresh(contract)
    return _build_detail(db, contract)


# ------------------------------------------------------------------
# Workflow transition (single generic endpoint)
# ------------------------------------------------------------------

def transition(
    db: Session,
    contract_id: int,
    org_id: int,
    action: str,
    current_user: User,
) -> dict:
    """Execute a named workflow action on the contract."""
    mapping = ACTION_TRANSITIONS.get(action)
    if mapping is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Acción desconocida: {action}",
        )
    expected_from, target = mapping

    contract = _get_contract_or_404(db, contract_id, org_id)
    current_status = ContractStatusEnum(contract.status) if isinstance(contract.status, str) else contract.status

    if current_status != expected_from:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Transición no permitida: el contrato está en "
                f"'{current_status.value}', pero la acción '{action}' requiere "
                f"'{expected_from.value}'"
            ),
        )

    # Apply status change
    contract.status = target

    # Side-effects per action
    if action == "approve":
        contract.reviewed_by_user_id = current_user.id
        _create_admin_task(
            db,
            contract,
            org_id,
            "Subir contrato y citar cliente para firma",
        )

    if action == "mark_signed":
        contract.signed_at = datetime.now(timezone.utc)

    if action == "upload_scan":
        contract.uploaded_at = datetime.now(timezone.utc)

    _log_audit(
        db,
        contract,
        f"contract_{action}",
        current_user,
        f"Estado cambiado a {target.value}",
    )

    db.commit()
    db.refresh(contract)
    return _build_detail(db, contract)


# ------------------------------------------------------------------
# File upload  (scanned contract)
# ------------------------------------------------------------------

def upload_scan_file(
    db: Session,
    contract_id: int,
    org_id: int,
    file: UploadFile,
    current_user: User,
) -> dict:
    """Upload a scanned document and attach it to the contract."""
    contract = _get_contract_or_404(db, contract_id, org_id)

    storage = get_storage()
    content = file.file.read()
    storage_path = storage.upload(
        file_name=file.filename or "scan.pdf",
        content=content,
        subfolder="contracts",
    )

    doc = Document(
        organization_id=org_id,
        entity_type="contract",
        entity_id=contract.id,
        doc_type=DocumentTypeEnum.CONTRACT_PDF,
        file_name=file.filename or "scan.pdf",
        storage_path=storage_path,
        status=DocumentStatusEnum.FINAL,
        uploaded_by_user_id=current_user.id,
    )
    db.add(doc)

    _log_audit(
        db,
        contract,
        "contract_scan_uploaded",
        current_user,
        f"Documento escaneado subido: {file.filename}",
    )

    db.commit()
    db.refresh(contract)
    return _build_detail(db, contract)
