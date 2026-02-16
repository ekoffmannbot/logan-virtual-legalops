from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.email_ticket import EmailTicket
from app.db.models.task import Task
from app.db.enums import EmailTicketStatusEnum, TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum


@celery_app.task(name="app.tasks.sla_tasks.check_email_sla")
def check_email_sla():
    """Check email tickets for SLA breaches (24h and 48h)."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        active_statuses = [
            EmailTicketStatusEnum.NEW,
            EmailTicketStatusEnum.DRAFTING,
            EmailTicketStatusEnum.WAITING_MANAGER_APPROVAL,
        ]

        # Check 24h SLA breach
        breached_24h = (
            db.query(EmailTicket)
            .filter(
                EmailTicket.status.in_(active_statuses),
                EmailTicket.sla_due_24h_at.isnot(None),
                EmailTicket.sla_due_24h_at < now,
            )
            .all()
        )

        count_24h = 0
        for ticket in breached_24h:
            if ticket.status != EmailTicketStatusEnum.SLA_BREACHED_24H:
                ticket.status = EmailTicketStatusEnum.SLA_BREACHED_24H
                ticket.updated_at = now
                # Create escalation task
                task = Task(
                    organization_id=ticket.organization_id,
                    title=f"SLA 24h excedido - Ticket #{ticket.id}: {ticket.subject[:50]}",
                    description="El ticket de correo ha excedido el SLA de 24 horas. Requiere atención inmediata.",
                    entity_type="email_ticket",
                    entity_id=ticket.id,
                    task_type=TaskTypeEnum.EMAIL_RESPONSE,
                    assigned_role="abogado_jefe",
                    due_at=now,
                    sla_policy=SLAPolicyEnum.EMAIL_24H,
                )
                db.add(task)
                count_24h += 1

        # Check 48h SLA breach
        breached_48h = (
            db.query(EmailTicket)
            .filter(
                EmailTicket.status == EmailTicketStatusEnum.SLA_BREACHED_24H,
                EmailTicket.sla_due_48h_at.isnot(None),
                EmailTicket.sla_due_48h_at < now,
            )
            .all()
        )

        count_48h = 0
        for ticket in breached_48h:
            ticket.status = EmailTicketStatusEnum.SLA_BREACHED_48H
            ticket.updated_at = now
            task = Task(
                organization_id=ticket.organization_id,
                title=f"URGENTE: SLA 48h excedido - Ticket #{ticket.id}",
                description="El ticket ha excedido el SLA de 48 horas. Se debe enviar correo de disculpas y respuesta.",
                entity_type="email_ticket",
                entity_id=ticket.id,
                task_type=TaskTypeEnum.EMAIL_RESPONSE,
                assigned_role="abogado_jefe",
                due_at=now,
                sla_policy=SLAPolicyEnum.EMAIL_48H,
            )
            db.add(task)
            count_48h += 1

        db.commit()
        return {"breached_24h": count_24h, "breached_48h": count_48h}
    finally:
        db.close()
