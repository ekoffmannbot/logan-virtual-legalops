import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.email_ticket import EmailTicket
from app.db.models.task import Task
from app.db.models.audit_log import AuditLog
from app.db.enums import EmailTicketStatusEnum, TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum

logger = logging.getLogger(__name__)


def _ai_draft(prompt: str, fallback: str) -> str:
    """Call AI provider with graceful fallback to rule-based text."""
    try:
        from app.modules.ai_assistant.provider import get_ai_provider
        provider = get_ai_provider("light")
        result = provider.ask(prompt, "")
        return result.get("answer", fallback)
    except Exception as exc:
        logger.warning("AI draft failed, using fallback: %s", exc)
        return fallback


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

                # AI-suggested response for the breached SLA
                ai_suggestion = _ai_draft(
                    f"El email con asunto '{ticket.subject}' del remitente {ticket.from_email} "
                    f"ha excedido el SLA de 24 horas sin respuesta. "
                    f"Redacta una disculpa breve y profesional (2-3 lineas) reconociendo el retraso "
                    f"y comprometiendose a responder a la brevedad.",
                    "El ticket de correo ha excedido el SLA de 24 horas. Requiere atencion inmediata.",
                )

                task = Task(
                    organization_id=ticket.organization_id,
                    title=f"SLA 24h excedido - Ticket #{ticket.id}: {ticket.subject[:50]}",
                    description=ai_suggestion,
                    entity_type="email_ticket",
                    entity_id=ticket.id,
                    task_type=TaskTypeEnum.EMAIL_RESPONSE,
                    assigned_role="abogado_jefe",
                    due_at=now,
                    sla_policy=SLAPolicyEnum.EMAIL_24H,
                )
                db.add(task)
                db.add(AuditLog(
                    organization_id=ticket.organization_id,
                    actor_user_id=None,
                    action="auto:email_sla_breach",
                    entity_type="email_ticket",
                    entity_id=ticket.id,
                    after_json={
                        "agent": "Abogado",
                        "detail": f"Email '{ticket.subject}' ha incumplido SLA de 24h",
                        "detail_long": ai_suggestion,
                        "ai_suggestion": ai_suggestion,
                        "status": "pending_approval",
                        "type": "warning",
                        "action_required": True,
                    },
                ))
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

            ai_urgente = _ai_draft(
                f"URGENTE: El email '{ticket.subject}' de {ticket.from_email} lleva mas de 48h sin respuesta. "
                f"Redacta una disculpa formal urgente (3-4 lineas) con compromiso de respuesta inmediata.",
                "El ticket ha excedido el SLA de 48 horas. Se debe enviar correo de disculpas y respuesta.",
            )

            task = Task(
                organization_id=ticket.organization_id,
                title=f"URGENTE: SLA 48h excedido - Ticket #{ticket.id}",
                description=ai_urgente,
                entity_type="email_ticket",
                entity_id=ticket.id,
                task_type=TaskTypeEnum.EMAIL_RESPONSE,
                assigned_role="abogado_jefe",
                due_at=now,
                sla_policy=SLAPolicyEnum.EMAIL_48H,
            )
            db.add(task)
            db.add(AuditLog(
                organization_id=ticket.organization_id,
                actor_user_id=None,
                action="auto:email_sla_breach_48h",
                entity_type="email_ticket",
                entity_id=ticket.id,
                after_json={
                    "agent": "Abogado",
                    "detail": f"URGENTE: Email '{ticket.subject}' ha incumplido SLA de 48h",
                    "detail_long": ai_urgente,
                    "ai_suggestion": ai_urgente,
                    "status": "pending_approval",
                    "type": "warning",
                    "action_required": True,
                },
            ))
            count_48h += 1

        db.commit()
        return {"breached_24h": count_24h, "breached_48h": count_48h}
    finally:
        db.close()
