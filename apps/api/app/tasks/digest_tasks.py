import logging
from datetime import datetime, timezone
from collections import defaultdict

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.task import Task
from app.db.models.invoice import Invoice
from app.db.models.email_ticket import EmailTicket
from app.db.models.user import User
from app.db.models.audit_log import AuditLog
from app.db.enums import TaskStatusEnum, InvoiceStatusEnum, EmailTicketStatusEnum

logger = logging.getLogger(__name__)

AGENT_ROLE = "secretaria"


@celery_app.task(name="app.tasks.digest_tasks.daily_digest")
def daily_digest():
    """Generate daily digest with AI summary and send via email to managers."""
    db = SessionLocal()
    try:
        from app.core.agent_dispatch import agent_draft, get_agent_id

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

        overdue_invoices = (
            db.query(Invoice)
            .filter(Invoice.status == InvoiceStatusEnum.OVERDUE)
            .all()
        )

        sla_at_risk = (
            db.query(EmailTicket)
            .filter(
                EmailTicket.status.in_([
                    EmailTicketStatusEnum.NEW,
                    EmailTicketStatusEnum.DRAFTING,
                    EmailTicketStatusEnum.SLA_BREACHED_24H,
                    EmailTicketStatusEnum.SLA_BREACHED_48H,
                ]),
            )
            .all()
        )

        total_overdue_amount = sum(inv.amount for inv in overdue_invoices)

        context_lines = [
            f"Fecha: {now.strftime('%d/%m/%Y')}",
            f"Tareas vencidas: {len(overdue_tasks)}",
            f"Facturas morosas: {len(overdue_invoices)} por un total de ${total_overdue_amount:,} CLP",
            f"Emails con SLA en riesgo/incumplido: {len(sla_at_risk)}",
        ]
        context = "\n".join(context_lines)

        fallback_summary = (
            f"Resumen diario Logan Virtual - {now.strftime('%d/%m/%Y')}\n\n"
            f"{context}\n\n"
            f"Se requiere atencion a los items pendientes."
        )

        # Use all orgs - get first org_id from any of the collected data
        org_ids = set()
        for t in overdue_tasks:
            org_ids.add(t.organization_id)
        for inv in overdue_invoices:
            org_ids.add(inv.organization_id)
        for ticket in sla_at_risk:
            org_ids.add(ticket.organization_id)
        if not org_ids:
            org_ids = {1}  # Default org

        first_org = next(iter(org_ids))
        ai_summary = agent_draft(
            db, first_org, AGENT_ROLE,
            f"Genera un resumen ejecutivo breve (5-8 lineas) del estado del estudio juridico hoy. "
            f"Datos:\n{context}\n\n"
            f"Incluye: situacion general, prioridades del dia, y recomendaciones concretas. "
            f"Tono profesional, directo, en espanol chileno.",
            fallback_summary, task_type="daily_digest",
        )

        for org_id in org_ids:
            db.add(AuditLog(
                organization_id=org_id,
                actor_user_id=None,
                agent_id=get_agent_id(db, org_id, AGENT_ROLE),
                action="auto:daily_digest_generated",
                entity_type="task",
                entity_id=None,
                after_json={
                    "agent": "Secretaria",
                    "detail": f"Resumen diario: {len(overdue_tasks)} tarea(s) vencida(s), "
                              f"{len(overdue_invoices)} factura(s) morosa(s)",
                    "detail_long": ai_summary,
                    "status": "completed",
                    "type": "warning" if overdue_tasks else "info",
                },
            ))

        db.commit()

        # Send email to managers
        from app.core.email import send_email

        managers = (
            db.query(User)
            .filter(User.role == "gerente_legal", User.active.is_(True))
            .all()
        )

        html_body = (
            f"<h2>Resumen Diario - Logan Virtual</h2>"
            f"<p><strong>{now.strftime('%d de %B de %Y')}</strong></p>"
            f"<pre style='font-family: sans-serif; line-height: 1.6;'>{ai_summary}</pre>"
            f"<hr>"
            f"<p style='color: #888; font-size: 12px;'>"
            f"Generado por la agente Secretaria de Logan Virtual.</p>"
        )

        emails_sent = 0
        for manager in managers:
            try:
                sent = send_email(
                    to=manager.email,
                    subject=f"Resumen diario Logan Virtual - {now.strftime('%d/%m/%Y')}",
                    body_html=html_body,
                    body_text=ai_summary,
                )
                if sent:
                    emails_sent += 1
            except Exception as exc:
                logger.error("Failed to send digest to %s: %s", manager.email, exc)

        return {
            "overdue_task_count": len(overdue_tasks),
            "overdue_invoices": len(overdue_invoices),
            "sla_at_risk": len(sla_at_risk),
            "emails_sent": emails_sent,
            "message": f"Daily digest generated and sent to {emails_sent} manager(s)",
        }
    finally:
        db.close()
