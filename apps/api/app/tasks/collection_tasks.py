from datetime import datetime, timezone, timedelta

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.invoice import Invoice
from app.db.models.collection_case import CollectionCase
from app.db.models.task import Task
from app.db.enums import (
    InvoiceStatusEnum, CollectionCaseStatusEnum,
    TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum,
)


@celery_app.task(name="app.tasks.collection_tasks.generate_collection_reminders")
def generate_collection_reminders():
    """Generate reminder tasks for invoices due in 5 days and overdue invoices."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        today = now.date()
        five_days_from_now = today + timedelta(days=5)

        # Invoices due in 5 days - create pre-due contact tasks
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
                task = Task(
                    organization_id=invoice.organization_id,
                    title=f"Cobranza preventiva - Factura #{invoice.id} vence en 5 días",
                    description=f"Contactar cliente. Monto: ${invoice.amount:,} CLP. Vencimiento: {invoice.due_date}",
                    entity_type="invoice",
                    entity_id=invoice.id,
                    task_type=TaskTypeEnum.COLLECTION_REMINDER,
                    assigned_role="secretaria",
                    due_at=now,
                    sla_policy=SLAPolicyEnum.COLLECTION_CALL_11_15_18,
                )
                db.add(task)
                count_pre_due += 1

        # Invoices due today - mark as due
        due_today = (
            db.query(Invoice)
            .filter(
                Invoice.status == InvoiceStatusEnum.SCHEDULED,
                Invoice.due_date == today,
            )
            .all()
        )
        for invoice in due_today:
            invoice.status = InvoiceStatusEnum.DUE
            invoice.updated_at = now

        # Invoices overdue - mark and escalate
        overdue = (
            db.query(Invoice)
            .filter(
                Invoice.status == InvoiceStatusEnum.DUE,
                Invoice.due_date < today,
            )
            .all()
        )
        for invoice in overdue:
            invoice.status = InvoiceStatusEnum.OVERDUE
            invoice.updated_at = now

        db.commit()
        return {"pre_due_tasks": count_pre_due, "marked_due": len(due_today), "marked_overdue": len(overdue)}
    finally:
        db.close()
