from typing import Tuple, List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models.user import User
from app.modules.users.schemas import UserCreate, UserUpdate


def create_user(
    db: Session, data: UserCreate, organization_id: int
) -> User:
    """Create a new user inside an organization (password is hashed)."""
    existing = (
        db.query(User)
        .filter(
            User.email == data.email,
            User.organization_id == organization_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con ese email en esta organización",
        )

    user = User(
        organization_id=organization_id,
        email=data.email,
        hashed_password=hash_password(data.password),
        full_name=data.full_name,
        role=data.role,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(
    db: Session,
    organization_id: int,
    skip: int = 0,
    limit: int = 50,
) -> Tuple[List[User], int]:
    """Return paginated users filtered by organization."""
    query = db.query(User).filter(User.organization_id == organization_id)
    total = query.count()
    items = query.order_by(User.id).offset(skip).limit(limit).all()
    return items, total


def get_user(db: Session, user_id: int, organization_id: int) -> User:
    """Get a single user, scoped to the organization."""
    user = (
        db.query(User)
        .filter(User.id == user_id, User.organization_id == organization_id)
        .first()
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )
    return user


def update_user(
    db: Session, user_id: int, organization_id: int, data: UserUpdate
) -> User:
    """Partially update a user within the same organization."""
    user = get_user(db, user_id, organization_id)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
