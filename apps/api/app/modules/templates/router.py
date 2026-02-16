from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.templates import service
from app.modules.templates.schemas import (
    TemplateCreate,
    TemplateUpdate,
    TemplateResponse,
    RenderRequest,
    RenderResponse,
)

router = APIRouter()


@router.get("/", response_model=List[TemplateResponse])
def list_templates(
    template_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.list_templates(
        db,
        org_id=current_user.organization_id,
        template_type=template_type,
        skip=skip,
        limit=limit,
    )


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_template(db, template_id, current_user.organization_id)


@router.post("/", response_model=TemplateResponse, status_code=201)
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.create_template(db, data, current_user.organization_id)


@router.patch("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: int,
    data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.update_template(db, template_id, data, current_user.organization_id)


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    service.delete_template(db, template_id, current_user.organization_id)


@router.post("/{template_id}/render", response_model=RenderResponse)
def render_template(
    template_id: int,
    data: RenderRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    rendered = service.render_template(
        db, template_id, data.variables, current_user.organization_id
    )
    return RenderResponse(rendered_text=rendered)
