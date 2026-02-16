"""Admin service: proxies to users and templates services."""

from typing import List, Tuple

from sqlalchemy.orm import Session

from app.modules.users import service as users_service
from app.modules.users.schemas import UserCreate, UserUpdate
from app.modules.templates import service as templates_service
from app.modules.templates.schemas import TemplateCreate
from app.db.models.user import User
from app.db.models.template import Template


# ── Users ────────────────────────────────────────────────────────────────────

def list_users(db: Session, org_id: int, skip: int = 0, limit: int = 50) -> Tuple[List[User], int]:
    return users_service.list_users(db, org_id, skip, limit)


def create_user(db: Session, data: UserCreate, org_id: int) -> User:
    return users_service.create_user(db, data, org_id)


def update_user(db: Session, user_id: int, org_id: int, data: UserUpdate) -> User:
    return users_service.update_user(db, user_id, org_id, data)


# ── Templates ────────────────────────────────────────────────────────────────

def list_templates(
    db: Session, org_id: int, skip: int = 0, limit: int = 50
) -> List[Template]:
    return templates_service.list_templates(db, org_id, skip=skip, limit=limit)


def create_template(db: Session, data: TemplateCreate, org_id: int) -> Template:
    return templates_service.create_template(db, data, org_id)


def archive_template(db: Session, template_id: int, org_id: int) -> None:
    """Deactivate a template (soft-delete)."""
    templates_service.delete_template(db, template_id, org_id)
