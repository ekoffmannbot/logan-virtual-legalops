from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.task import Task
from app.db.enums import TaskStatusEnum


@celery_app.task(name="app.tasks.digest_tasks.daily_digest")
def daily_digest():
    """Generate daily digest of overdue and upcoming tasks per user. (MVP: logs only)"""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        overdue_tasks = (
            db.query(Task)
            .filter(
                Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
                Task.due_at.isnot(None),
                Task.due_at < now,
            )
            .all()
        )
        # In MVP, just return the count. In production, this would send email digests.
        return {
            "overdue_task_count": len(overdue_tasks),
            "message": "Daily digest generated (email sending disabled in MVP)",
        }
    finally:
        db.close()
