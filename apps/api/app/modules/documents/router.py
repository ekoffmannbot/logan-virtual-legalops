from typing import Optional, List

from fastapi import APIRouter, Depends, Query, UploadFile, File, Form
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.documents import service
from app.modules.documents.schemas import DocumentResponse

router = APIRouter()


@router.post("/upload", response_model=DocumentResponse, status_code=201)
def upload_document(
    file: UploadFile = File(...),
    entity_type: str = Form(...),
    entity_id: int = Form(...),
    doc_type: str = Form(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.upload_document(
        db,
        file=file,
        entity_type=entity_type,
        entity_id=entity_id,
        doc_type=doc_type,
        user_id=current_user.id,
        org_id=current_user.organization_id,
    )


@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.list_documents(
        db,
        org_id=current_user.organization_id,
        entity_type=entity_type,
        entity_id=entity_id,
        skip=skip,
        limit=limit,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_document(db, document_id, current_user.organization_id)


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
