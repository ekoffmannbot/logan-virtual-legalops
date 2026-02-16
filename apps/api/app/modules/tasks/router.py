from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.tasks.schemas import TaskListResponse, TaskStatsResponse
from app.modules.tasks import service

router = APIRouter()


@router.get("/", response_model=TaskListResponse)
def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all tasks for the current organization."""
    return service.list_tasks(db, current_user.organization_id, skip, limit)


@router.get("/stats", response_model=TaskStatsResponse)
def get_task_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregate task statistics."""
    return service.get_task_stats(db, current_user.organization_id)
