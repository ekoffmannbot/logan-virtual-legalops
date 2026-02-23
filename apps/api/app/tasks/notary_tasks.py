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


def _ai_draft(prompt: str, fallback: str) -> str:
    """Call AI provider with graceful fallback to rule-based text."""
    try:
        from app.modules.ai_assistant.provider import get_ai_provider
        provider = get_ai_provider()
        result = provider.ask(prompt, "")
        return result.get("answer", fallback)
    except Exception as exc:
        logger.warning("AI draft failed, using fallback: %s", exc)
        return fallback


@celery_app.task(name="app.tasks.notary_tasks.generate_notary_contact_tasks")
def generate_notary_contact_tasks():
    """Create contact attempt tasks at 10:00, 13:00, 17:00 for notary docs pending client contact."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today = now.date()

        docs_pending_contact = (
            db.query(NotaryDocument)
            .filter(
                NotaryDocument.status == NotaryDocStatusEnum.CLIENT_CONTACT_PENDING,
            )
            .all()
        )

        count = 0
        contact_hours = [10, 13, 17]

        for doc in docs_pending_contact:
            # Generate AI call script once per document
            fallback_script = f"Intentar contacto con cliente para documento notarial. Horario programado."
            ai_script = _ai_draft(
                f"Genera un guion breve (3-4 lineas) para llamar a un cliente sobre un documento notarial "
                f"(documento #{doc.id}, tipo: {doc.document_type if hasattr(doc, 'document_type') else 'notarial'}). "
                f"El objetivo es coordinar la firma o entrega. Tono profesional y amable.",
                fallback_script,
            )

            for hour in contact_hours:
                due_time = datetime(
                    today.year, today.month, today.day,
                    hour, 0, 0, tzinfo=timezone.utc
                )
                # Skip if past this hour today
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
                        action="auto:notary_contact_task_created",
                        entity_type="notary_document",
                        entity_id=doc.id,
                        after_json={
                            "agent": "Procurador",
                            "detail": f"Tarea de contacto notarial creada para documento #{doc.id}",
                            "detail_long": ai_script,
                            "status": "completed",
                            "type": "info",
                        },
                    ))
                    count += 1

        db.commit()
        return {"contact_tasks_created": count}
    finally:
        db.close()
