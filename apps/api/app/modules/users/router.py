from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_role
from app.db.enums import RoleEnum
from app.db.models.user import User
from app.modules.users.schemas import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.modules.users import service

router = APIRouter()


@router.get("/", response_model=UserListResponse)
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """List users in the current organization. GERENTE_LEGAL or ADMINISTRACION."""
    items, total = service.list_users(db, current_user.organization_id, skip, limit)
    return UserListResponse(items=items, total=total)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Get a single user by ID. GERENTE_LEGAL or ADMINISTRACION."""
    return service.get_user(db, user_id, current_user.organization_id)


@router.post("/", response_model=UserResponse, status_code=201)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Create a new user in the current organization. GERENTE_LEGAL or ADMINISTRACION."""
    return service.create_user(db, data, current_user.organization_id)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role(RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION)
    ),
):
    """Update a user in the current organization. GERENTE_LEGAL or ADMINISTRACION."""
    return service.update_user(db, user_id, current_user.organization_id, data)
