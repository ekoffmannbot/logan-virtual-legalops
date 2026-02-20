from datetime import datetime, timezone
from typing import List, Optional

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.enums import TaskStatusEnum, TaskTypeEnum, SLAPolicyEnum
from app.db.models.task import Task
from app.db.models.user import User
from app.db.models.matter import Matter
from app.db.models.lead import Lead
from app.db.models.client import Client


def _resolve_entity_label(db: Session, entity_type: Optional[str], entity_id: Optional[int]) -> Optional[str]:
    """Compute a human-readable label from entity_type + entity_id."""
    if not entity_type or not entity_id:
        return None

    label_map = {
        "matter": (Matter, "title"),
        "lead": (Lead, "full_name"),
        "client": (Client, "full_name_or_company"),
    }

    entry = label_map.get(entity_type)
    if not entry:
        return f"{entity_type}#{entity_id}"

    model_cls, attr_name = entry
    obj = db.query(model_cls).filter(model_cls.id == entity_id).first()
    if obj:
        return getattr(obj, attr_name, None)
    return f"{entity_type}#{entity_id}"


def _resolve_sla_priority(sla_policy: str) -> Optional[str]:
    """Map SLA policy to a priority string for the frontend."""
    if sla_policy == "none":
        return "normal"
    elif "24h" in sla_policy:
        return "high"
    elif "48h" in sla_policy:
        return "medium"
    elif "72h" in sla_policy:
        return "medium"
    else:
        return "normal"


def _enrich_task(db: Session, t: Task) -> dict:
    """Convert a Task ORM instance into the enriched dict expected by TaskResponse."""
    # Resolve assigned user name
    assigned_to_name = None
    if t.assigned_to_user_id:
        user = db.query(User).filter(User.id == t.assigned_to_user_id).first()
        if user:
            assigned_to_name = user.full_name

    # Resolve entity label
    entity_label = _resolve_entity_label(db, t.entity_type, t.entity_id)

    # Map sla_policy to priority
    sla_val = t.sla_policy if isinstance(t.sla_policy, str) else t.sla_policy.value
    priority = _resolve_sla_priority(sla_val)

    return {
        "id": t.id,
        "title": t.title,
        "description": t.description,
        "type": t.task_type if isinstance(t.task_type, str) else t.task_type.value,
        "status": t.status if isinstance(t.status, str) else t.status.value,
        "assigned_to": t.assigned_to_user_id,
        "assigned_to_name": assigned_to_name,
        "due_date": t.due_at,
        "entity_type": t.entity_type,
        "entity_id": t.entity_id,
        "entity_label": entity_label,
        "priority": priority,
        "created_at": t.created_at,
    }


def list_tasks(db: Session, org_id: int, skip: int = 0, limit: int = 50) -> dict:
    """List all tasks for the organization."""
    query = db.query(Task).filter(Task.organization_id == org_id)
    total = query.count()
    tasks = query.order_by(Task.created_at.desc()).offset(skip).limit(limit).all()

    items = [_enrich_task(db, t) for t in tasks]

    return {"items": items, "total": total}


def get_task_stats(db: Session, org_id: int) -> dict:
    """Return aggregate task stats for the organization."""
    base = db.query(Task).filter(Task.organization_id == org_id)

    total = base.count()

    pending = base.filter(Task.status == TaskStatusEnum.OPEN).count()
    in_progress = base.filter(Task.status == TaskStatusEnum.IN_PROGRESS).count()
    completed = base.filter(Task.status == TaskStatusEnum.DONE).count()

    now = datetime.now(timezone.utc)
    overdue = (
        base.filter(
            Task.due_at < now,
            Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
        ).count()
    )

    return {
        "total": total,
        "pending": pending,
        "in_progress": in_progress,
        "completed": completed,
        "overdue": overdue,
    }


def create_task(db: Session, data: dict, org_id: int) -> dict:
    """Create a new task for the organization and return enriched response."""
    task = Task(
        organization_id=org_id,
        title=data["title"],
        description=data.get("description"),
        task_type=TaskTypeEnum(data.get("task_type", "general")),
        entity_type=data.get("entity_type"),
        entity_id=data.get("entity_id"),
        assigned_to_user_id=data.get("assigned_to_user_id"),
        assigned_role=data.get("assigned_role"),
        due_at=data.get("due_at"),
        sla_policy=SLAPolicyEnum(data.get("sla_policy", "none")),
        status=TaskStatusEnum.OPEN,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _enrich_task(db, task)


def update_task(db: Session, task_id: int, org_id: int, data: dict) -> dict:
    """Update an existing task. Sets completed_at when status transitions to done."""
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.organization_id == org_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in data.items():
        if field == "status":
            value = TaskStatusEnum(value)
            if value == TaskStatusEnum.DONE and task.status != TaskStatusEnum.DONE:
                task.completed_at = datetime.now(timezone.utc)
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return _enrich_task(db, task)


def delete_task(db: Session, task_id: int, org_id: int) -> None:
    """Soft-delete a task by setting its status to cancelled."""
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.organization_id == org_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatusEnum.CANCELLED
    db.commit()
