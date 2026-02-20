from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.agent_logs import service

router = APIRouter()


@router.get("/")
def get_agent_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get agent activity logs."""
    return service.get_agent_logs(db, current_user.organization_id, limit)
