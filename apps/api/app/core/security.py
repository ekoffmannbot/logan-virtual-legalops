from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@dataclass
class AgentIdentity:
    """Identity object for AI agents operating internally."""
    id: int
    organization_id: int
    role: str
    display_name: str
    is_agent: bool = True


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_agent_token(agent_id: int, org_id: int, role: str) -> str:
    """Create an internal JWT token for an AI agent."""
    data = {"sub": str(agent_id), "org": org_id, "role": role, "agent": True}
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    data.update({"exp": expire, "type": "access"})
    return jwt.encode(data, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    from app.db.models.user import User

    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Tipo de token inválido")

    # Agent token — return AgentIdentity instead of User
    if payload.get("agent"):
        from app.db.models import AIAgent
        agent_id = int(payload.get("sub", 0))
        agent = db.query(AIAgent).filter(AIAgent.id == agent_id, AIAgent.is_active.is_(True)).first()
        if agent is None:
            raise HTTPException(status_code=401, detail="Agente no encontrado o inactivo")
        role_val = agent.role if isinstance(agent.role, str) else agent.role.value
        return AgentIdentity(
            id=agent.id,
            organization_id=agent.organization_id,
            role=role_val,
            display_name=agent.display_name,
        )

    # Human user token
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.id == int(user_id), User.active.is_(True)).first()
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado o inactivo")
    return user


def require_role(*roles):
    def dependency(current_user=Depends(get_current_user)):
        if current_user.role not in [r.value if hasattr(r, "value") else r for r in roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Rol requerido: {', '.join(str(r) for r in roles)}",
            )
        return current_user

    return dependency
