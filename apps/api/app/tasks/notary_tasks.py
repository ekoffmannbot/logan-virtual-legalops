import logging
from datetime import datetime, timezone, timedelta

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.notary_document import NotaryDocument
from app.db.models.task import Task
from app.db.models.audit_log import AuditLog
from app.db.enums import (
    NotaryDocStatusEnum, TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum,
)

logger = logging.getLogger(__name__)

AGENT_ROLE = "procurador"


@celery_app.task(name="app.tasks.notary_tasks.generate_notary_contact_tasks")
def generate_notary_contact_tasks():
    """Create contact attempt tasks at 10:00, 13:00, 17:00 for notary docs pending client contact."""
    db = SessionLocal()
    try:
        from app.core.agent_dispatch import agent_draft, get_agent_id

        now = datetime.now(timezone.utc)
        today = now.date()

        docs_pending_contact = (
            db.query(NotaryDocument)
            .filter(NotaryDocument.status == NotaryDocStatusEnum.CLIENT_CONTACT_PENDING)
            .all()
        )

        count = 0
        contact_hours = [10, 13, 17]

        for doc in docs_pending_contact:
            fallback_script = f"Intentar contacto con cliente para documento notarial. Horario programado."
            ai_script = agent_draft(
                db, doc.organization_id, AGENT_ROLE,
                f"Genera un guion breve (3-4 lineas) para llamar a un cliente sobre un documento notarial "
                f"(documento #{doc.id}, tipo: {doc.doc_type}). "
                f"El objetivo es coordinar la firma o entrega. Tono profesional y amable.",
                fallback_script, task_type="notary_contact_script",
            )

            for hour in contact_hours:
                due_time = datetime(
                    today.year, today.month, today.day,
                    hour, 0, 0, tzinfo=timezone.utc
                )
                if due_time < now:
                    continue

                existing = (
                    db.query(Task)
                    .filter(
                        Task.entity_type == "notary_document",
                        Task.entity_id == doc.id,
                        Task.task_type == TaskTypeEnum.NOTARY_CONTACT,
                        Task.due_at == due_time,
                        Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
                    )
                    .first()
                )
                if not existing:
                    task = Task(
                        organization_id=doc.organization_id,
                        title=f"Contactar cliente - Doc. notarial #{doc.id} ({hour}:00)",
                        description=ai_script,
                        entity_type="notary_document",
                        entity_id=doc.id,
                        task_type=TaskTypeEnum.NOTARY_CONTACT,
                        assigned_role="abogado",
                        due_at=due_time,
                        sla_policy=SLAPolicyEnum.NOTARY_CONTACT_10_13_17,
                    )
                    db.add(task)
                    db.add(AuditLog(
                        organization_id=doc.organization_id,
                        actor_user_id=None,
                        agent_id=get_agent_id(db, doc.organization_id, AGENT_ROLE),
                        action="auto:notary_contact_task_created",
                        entity_type="notary_document",
                        entity_id=doc.id,
                        after_json={
                            "agent": "Procurador",
                            "detail": f"Tarea de contacto notarial creada para documento #{doc.id}",
                            "detail_long": ai_script,
                            "status": "completed", "type": "info",
                        },
                    ))
                    count += 1

        db.commit()
        return {"contact_tasks_created": count}
    finally:
        db.close()
