from typing import Optional, List

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.documents import service
from app.modules.documents.schemas import DocumentResponse

router = APIRouter()


def _enrich_doc(doc, db: Session) -> dict:
    """Add frontend-friendly fields to a Document ORM object."""
    status_val = doc.status if isinstance(doc.status, str) else doc.status.value
    doc_type_val = doc.doc_type if isinstance(doc.doc_type, str) else doc.doc_type.value
    # Resolve uploaded_by_name
    uploaded_by_name = None
    if doc.uploaded_by_user_id:
        user = db.query(User.full_name).filter(User.id == doc.uploaded_by_user_id).first()
        if user:
            uploaded_by_name = user[0]
    return {
        "id": doc.id,
        "entity_type": doc.entity_type,
        "entity_id": doc.entity_id,
        "doc_type": doc_type_val,
        "file_name": doc.file_name,
        "storage_path": doc.storage_path,
        "version_int": doc.version_int,
        "status": status_val,
        "uploaded_by_user_id": doc.uploaded_by_user_id,
        "created_at": doc.created_at,
        "metadata_json": doc.metadata_json,
        # Frontend aliases
        "name": doc.file_name,
        "uploaded_by_name": uploaded_by_name,
        "file_url": f"/api/v1/documents/{doc.id}/download",
    }


@router.post("/upload", status_code=201)
def upload_document(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    doc_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = service.upload_document(
        db,
        file=file,
        entity_type=entity_type,
        entity_id=entity_id,
        doc_type=doc_type,
        user_id=current_user.id,
        org_id=current_user.organization_id,
    )
    return _enrich_doc(doc, db)


@router.get("/")
def list_documents(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    docs = service.list_documents(
        db,
        org_id=current_user.organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        skip=skip,
        limit=limit,
    )
    return [_enrich_doc(d, db) for d in docs]


@router.get("/{document_id}")
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doc = service.get_document(db, document_id, current_user.organization_id)
    return _enrich_doc(doc, db)


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    content, file_name = service.download_document(
        db, document_id, current_user.organization_id
    )
    return Response(
        content=content,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
    )
