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


def _map_user(user: User) -> dict:
    """Map a User ORM object to the shape the admin frontend expects."""
    role_val = user.role if isinstance(user.role, str) else user.role.value
    return {
        "id": user.id,
        "organization_id": user.organization_id,
        "email": user.email,
        "full_name": user.full_name,
        "role": role_val,
        "active": user.active,
        "is_active": user.active,  # frontend alias
        "last_login_at": user.last_login_at,
        "last_login": user.last_login_at,  # frontend alias
        "created_at": user.created_at,
        "updated_at": user.updated_at,
    }


def _map_template(tmpl) -> dict:
    """Map a Template ORM object to the shape the admin frontend expects."""
    return {
        "id": tmpl.id,
        "org_id": tmpl.organization_id,
        "template_type": tmpl.template_type,
        "type": tmpl.template_type,  # frontend alias
        "name": tmpl.name,
        "content_text": tmpl.content_text,
        "content": tmpl.content_text,  # frontend alias
        "variables_json": tmpl.variables_json,
        "variables": tmpl.variables_json,  # frontend alias
        "active": tmpl.active,
        "is_active": tmpl.active,  # frontend alias
        "category": tmpl.template_type,  # frontend alias
        "status": "active" if tmpl.active else "archived",  # frontend alias
        "created_at": tmpl.created_at,
        "updated_at": tmpl.updated_at,
    }


# ── Admin Dashboard ──────────────────────────────────────────────────────────

@router.get("/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Admin overview dashboard with system-level stats."""
    org_id = current_user.organization_id
    from app.db.models import (
        User as UserModel, Lead, Matter, Invoice, Template, AIAgent,
    )
    total_users = db.query(UserModel).filter(UserModel.organization_id == org_id).count()
    active_users = db.query(UserModel).filter(
        UserModel.organization_id == org_id, UserModel.active.is_(True)
    ).count()
    total_leads = db.query(Lead).filter(Lead.organization_id == org_id).count()
    total_matters = db.query(Matter).filter(Matter.organization_id == org_id).count()
    total_invoices = db.query(Invoice).filter(Invoice.organization_id == org_id).count()
    total_templates = db.query(Template).filter(Template.organization_id == org_id).count()
    total_agents = db.query(AIAgent).filter(AIAgent.organization_id == org_id).count()
    active_agents = db.query(AIAgent).filter(
        AIAgent.organization_id == org_id, AIAgent.is_active.is_(True)
    ).count()
    return {
        "users": {"total": total_users, "active": active_users},
        "leads": total_leads,
        "matters": total_matters,
        "invoices": total_invoices,
        "templates": total_templates,
        "agents": {"total": total_agents, "active": active_agents},
    }


# ── Users endpoints ──────────────────────────────────────────────────────────

@router.get("/users")
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """List users in the current organization (admin).
    Returns a plain array (frontend expects User[]).
    """
    items, total = service.list_users(db, current_user.organization_id, skip, limit)
    return [_map_user(u) for u in items]


@router.post("/users", status_code=201)
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
    user = service.create_user(db, user_data, current_user.organization_id)
    return _map_user(user)


@router.patch("/users/{user_id}")
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
    user = service.update_user(db, user_id, current_user.organization_id, user_data)
    return _map_user(user)


# ── Templates endpoints ─────────────────────────────────────────────────────

@router.get("/templates")
def list_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """List templates (admin). Returns a plain array (frontend expects Template[])."""
    items = service.list_templates(db, current_user.organization_id, skip, limit)
    return [_map_template(t) for t in items]


@router.post("/templates", status_code=201)
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
    tmpl = service.create_template(db, tmpl_data, current_user.organization_id)
    return _map_template(tmpl)


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
