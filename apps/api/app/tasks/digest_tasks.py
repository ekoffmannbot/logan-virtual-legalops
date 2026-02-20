from datetime import datetime, timezone
from collections import defaultdict

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.task import Task
from app.db.models.audit_log import AuditLog
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
        # Group overdue tasks by organization for audit logging
        org_counts = defaultdict(int)
        for task in overdue_tasks:
            org_counts[task.organization_id] += 1

        for org_id, task_count in org_counts.items():
            db.add(AuditLog(
                organization_id=org_id,
                actor_user_id=None,
                action="auto:daily_digest_generated",
                entity_type="task",
                entity_id=None,
                after_json={
                    "agent": "Secretaria",
                    "detail": f"Resumen diario: {task_count} tarea(s) vencida(s) detectada(s)",
                    "status": "completed",
                    "type": "warning" if task_count > 0 else "info",
                },
            ))
        db.commit()

        # In MVP, just return the count. In production, this would send email digests.
        return {
            "overdue_task_count": len(overdue_tasks),
            "message": "Daily digest generated (email sending disabled in MVP)",
        }
    finally:
        db.close()
