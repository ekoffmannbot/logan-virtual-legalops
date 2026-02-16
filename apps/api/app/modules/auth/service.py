from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.db.models.user import User
from app.modules.auth.schemas import TokenResponse


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Validate credentials and return the user or raise 401."""
    user = (
        db.query(User)
        .filter(User.email == email, User.active.is_(True))
        .first()
    )
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return user


def create_tokens(user: User) -> TokenResponse:
    """Create access + refresh token pair for a user."""
    token_data = {
        "sub": str(user.id),
        "org": user.organization_id,
        "role": user.role if isinstance(user.role, str) else user.role.value,
    }
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
    )


def refresh_tokens(db: Session, refresh_token: str) -> TokenResponse:
    """Validate a refresh token and issue a new token pair."""
    payload = decode_token(refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere un refresh token",
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user = (
        db.query(User)
        .filter(User.id == int(user_id), User.active.is_(True))
        .first()
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado o inactivo",
        )

    return create_tokens(user)
