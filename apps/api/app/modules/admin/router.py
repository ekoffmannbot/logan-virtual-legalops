from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.db.enums import RoleEnum
from app.db.models.user import User
from app.modules.admin import service
from app.modules.admin.schemas import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    AdminUserListResponse,
    AdminTemplateCreate,
    AdminTemplateResponse,
    AdminTemplateListResponse,
)
from app.modules.users.schemas import UserCreate, UserUpdate
from app.modules.templates.schemas import TemplateCreate

router = APIRouter()


# ── Users endpoints ──────────────────────────────────────────────────────────

@router.get("/users", response_model=AdminUserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """List users in the current organization (admin)."""
    items, total = service.list_users(db, current_user.organization_id, skip, limit)
    return AdminUserListResponse(items=items, total=total)


@router.post("/users", response_model=AdminUserResponse, status_code=201)
def create_user(
    data: AdminUserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Create a new user (admin)."""
    user_data = UserCreate(
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        role=data.role,
    )
    return service.create_user(db, user_data, current_user.organization_id)


@router.patch("/users/{user_id}", response_model=AdminUserResponse)
def update_user(
    user_id: int,
    data: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Update a user (admin). Supports is_active toggle via active field."""
    user_data = UserUpdate(
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        active=data.active,
    )
    return service.update_user(db, user_id, current_user.organization_id, user_data)


# ── Templates endpoints ─────────────────────────────────────────────────────

@router.get("/templates", response_model=AdminTemplateListResponse)
def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """List templates (admin)."""
    items = service.list_templates(db, current_user.organization_id, skip, limit)
    return AdminTemplateListResponse(items=items, total=len(items))


@router.post("/templates", response_model=AdminTemplateResponse, status_code=201)
def create_template(
    data: AdminTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Create a new template (admin)."""
    tmpl_data = TemplateCreate(
        template_type=data.template_type,
        name=data.name,
        content_text=data.content_text,
        variables_json=data.variables_json,
    )
    return service.create_template(db, tmpl_data, current_user.organization_id)


@router.post("/templates/{template_id}/archive", status_code=200)
def archive_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Deactivate (archive) a template."""
    service.archive_template(db, template_id, current_user.organization_id)
    return {"message": "Plantilla archivada exitosamente"}
