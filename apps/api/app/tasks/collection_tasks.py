import logging
from datetime import datetime, timezone, timedelta

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.invoice import Invoice
from app.db.models.collection_case import CollectionCase
from app.db.models.task import Task
from app.db.models.audit_log import AuditLog
from app.db.enums import (
    InvoiceStatusEnum, CollectionCaseStatusEnum,
    TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum,
)

logger = logging.getLogger(__name__)

AGENT_ROLE = "jefe_cobranza"


@celery_app.task(name="app.tasks.collection_tasks.generate_collection_reminders")
def generate_collection_reminders():
    """Generate reminder tasks for invoices due in 5 days and overdue invoices."""
    db = SessionLocal()
    try:
        from app.core.agent_dispatch import agent_draft, get_agent_id

        now = datetime.now(timezone.utc)
        today = now.date()
        five_days_from_now = today + timedelta(days=5)

        upcoming = (
            db.query(Invoice)
            .filter(
                Invoice.status.in_([InvoiceStatusEnum.SCHEDULED, InvoiceStatusEnum.DUE]),
                Invoice.due_date == five_days_from_now,
            )
            .all()
        )

        count_pre_due = 0
        for invoice in upcoming:
            existing = (
                db.query(Task)
                .filter(
                    Task.entity_type == "invoice",
                    Task.entity_id == invoice.id,
                    Task.task_type == TaskTypeEnum.COLLECTION_REMINDER,
                    Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
                )
                .first()
            )
            if not existing:
                fallback_desc = f"Contactar cliente. Monto: ${invoice.amount:,} CLP. Vencimiento: {invoice.due_date}"
                ai_desc = agent_draft(
                    db, invoice.organization_id, AGENT_ROLE,
                    f"Redacta un mensaje breve y profesional de cobranza preventiva para un cliente. "
                    f"La factura #{invoice.id} por ${invoice.amount:,} CLP vence en 5 días ({invoice.due_date}). "
                    f"Tono cordial pero firme. Máximo 3 líneas.",
                    fallback_desc, task_type="collection_reminder",
                )

                task = Task(
                    organization_id=invoice.organization_id,
                    title=f"Cobranza preventiva - Factura #{invoice.id} vence en 5 dias",
                    description=ai_desc,
                    entity_type="invoice",
                    entity_id=invoice.id,
                    task_type=TaskTypeEnum.COLLECTION_REMINDER,
                    assigned_role="secretaria",
                    due_at=now,
                    sla_policy=SLAPolicyEnum.COLLECTION_CALL_11_15_18,
                )
                db.add(task)
                db.add(AuditLog(
                    organization_id=invoice.organization_id,
                    actor_user_id=None,
                    agent_id=get_agent_id(db, invoice.organization_id, AGENT_ROLE),
                    action="auto:collection_reminder_created",
                    entity_type="invoice",
                    entity_id=invoice.id,
                    after_json={
                        "agent": "Contador",
                        "detail": f"Recordatorio de cobro creado para factura #{invoice.id}",
                        "detail_long": ai_desc,
                        "status": "completed",
                        "type": "info",
                    },
                ))
                count_pre_due += 1

        due_today = (
            db.query(Invoice)
            .filter(Invoice.status == InvoiceStatusEnum.SCHEDULED, Invoice.due_date == today)
            .all()
        )
        for invoice in due_today:
            invoice.status = InvoiceStatusEnum.DUE
            invoice.updated_at = now
            db.add(AuditLog(
                organization_id=invoice.organization_id,
                actor_user_id=None,
                agent_id=get_agent_id(db, invoice.organization_id, AGENT_ROLE),
                action="auto:invoice_marked_due",
                entity_type="invoice",
                entity_id=invoice.id,
                after_json={
                    "agent": "Contador",
                    "detail": f"Factura #{invoice.id} marcada como vencida hoy",
                    "status": "completed", "type": "info",
                },
            ))

        overdue = (
            db.query(Invoice)
            .filter(Invoice.status == InvoiceStatusEnum.DUE, Invoice.due_date < today)
            .all()
        )
        for invoice in overdue:
            invoice.status = InvoiceStatusEnum.OVERDUE
            invoice.updated_at = now
            ai_escalation = agent_draft(
                db, invoice.organization_id, AGENT_ROLE,
                f"La factura #{invoice.id} por ${invoice.amount:,} CLP esta morosa (vencio el {invoice.due_date}). "
                f"Recomienda una estrategia de escalamiento en 2 lineas.",
                f"Factura #{invoice.id} marcada como morosa. Requiere escalamiento.",
                task_type="collection_escalation",
            )
            db.add(AuditLog(
                organization_id=invoice.organization_id,
                actor_user_id=None,
                agent_id=get_agent_id(db, invoice.organization_id, AGENT_ROLE),
                action="auto:invoice_overdue",
                entity_type="invoice",
                entity_id=invoice.id,
                after_json={
                    "agent": "Contador",
                    "detail": f"Factura #{invoice.id} marcada como morosa",
                    "detail_long": ai_escalation,
                    "status": "pending_approval", "type": "warning", "action_required": True,
                },
            ))

        db.commit()
        return {"pre_due_tasks": count_pre_due, "marked_due": len(due_today), "marked_overdue": len(overdue)}
    finally:
        db.close()
