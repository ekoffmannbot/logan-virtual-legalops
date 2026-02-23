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


@celery_app.task(name="app.tasks.digest_tasks.daily_digest")
def daily_digest():
    """Generate daily digest with AI summary and send via email to managers."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        # ── Gather data ──────────────────────────────────────────────
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

        # ── Build context for AI ─────────────────────────────────────
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

        ai_summary = _ai_draft(
            f"Genera un resumen ejecutivo breve (5-8 lineas) del estado del estudio juridico hoy. "
            f"Datos:\n{context}\n\n"
            f"Incluye: situacion general, prioridades del dia, y recomendaciones concretas. "
            f"Tono profesional, directo, en espanol chileno.",
            fallback_summary,
        )

        # ── Group by org and log ─────────────────────────────────────
        org_counts = defaultdict(int)
        for task in overdue_tasks:
            org_counts[task.organization_id] += 1

        for inv in overdue_invoices:
            org_counts.setdefault(inv.organization_id, 0)
        for ticket in sla_at_risk:
            org_counts.setdefault(ticket.organization_id, 0)

        for org_id in org_counts:
            db.add(AuditLog(
                organization_id=org_id,
                actor_user_id=None,
                action="auto:daily_digest_generated",
                entity_type="task",
                entity_id=None,
                after_json={
                    "agent": "Secretaria",
                    "detail": f"Resumen diario: {org_counts[org_id]} tarea(s) vencida(s), "
                              f"{len(overdue_invoices)} factura(s) morosa(s)",
                    "detail_long": ai_summary,
                    "status": "completed",
                    "type": "warning" if org_counts[org_id] > 0 else "info",
                },
            ))

        db.commit()

        # ── Send email to managers ───────────────────────────────────
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
            f"Generado automaticamente por el agente Secretaria de Logan Virtual.</p>"
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
