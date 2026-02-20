from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.tasks.schemas import TaskCreate, TaskListResponse, TaskResponse, TaskStatsResponse, TaskUpdate
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


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new task."""
    return service.create_task(db, payload.model_dump(), current_user.organization_id)


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing task."""
    return service.update_task(db, task_id, current_user.organization_id, payload.model_dump(exclude_unset=True))


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a task (sets status to cancelled)."""
    service.delete_task(db, task_id, current_user.organization_id)
