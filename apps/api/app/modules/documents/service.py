from typing import Optional, List

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.storage import LocalStorage, get_storage
from app.db.models.document import Document
from app.db.enums import DocumentTypeEnum, DocumentStatusEnum


def upload_document(
    db: Session,
    file: UploadFile,
    entity_type: str,
    entity_id: int,
    doc_type: str,
    user_id: int,
    org_id: int,
) -> Document:
    """Upload a file and create a Document record."""
    # Validate doc_type
    try:
        doc_type_enum = DocumentTypeEnum(doc_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de documento inválido: {doc_type}. Valores permitidos: {[e.value for e in DocumentTypeEnum]}",
        )

    # Determine version (increment if same entity + doc_type exists)
    latest = (
        db.query(Document)
        .filter(
            Document.organization_id == org_id,
            Document.entity_type == entity_type,
            Document.entity_id == entity_id,
            Document.doc_type == doc_type_enum,
        )
        .order_by(Document.version_int.desc())
        .first()
    )
    next_version = (latest.version_int + 1) if latest else 1

    # Read file content and store
    content = file.file.read()
    storage = get_storage()
    subfolder = f"{entity_type}/{entity_id}"
    storage_path = storage.upload(file.filename or "unnamed", content, subfolder=subfolder)

    document = Document(
        organization_id=org_id,
        entity_type=entity_type,
        entity_id=entity_id,
        doc_type=doc_type_enum,
        file_name=file.filename or "unnamed",
        storage_path=storage_path,
        version_int=next_version,
        status=DocumentStatusEnum.DRAFT,
        uploaded_by_user_id=user_id,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def download_document(db: Session, document_id: int, org_id: int) -> tuple[bytes, str]:
    """Return file bytes and filename for a document."""
    doc = get_document(db, document_id, org_id)
    storage = get_storage()
    try:
        content = storage.download(doc.storage_path)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el almacenamiento")
    return content, doc.file_name


def list_documents(
    db: Session,
    org_id: int,
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Document]:
    q = db.query(Document).filter(Document.organization_id == org_id)
    if entity_type:
        q = q.filter(Document.entity_type == entity_type)
    if entity_id:
        q = q.filter(Document.entity_id == entity_id)
    return q.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()


def get_document(db: Session, document_id: int, org_id: int) -> Document:
    doc = (
        db.query(Document)
        .filter(Document.id == document_id, Document.organization_id == org_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    return doc
