import logging
from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.proposal import Proposal
from app.db.models.task import Task
from app.db.models.audit_log import AuditLog
from app.db.enums import ProposalStatusEnum, TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum

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


@celery_app.task(name="app.tasks.proposal_tasks.expire_proposals")
def expire_proposals():
    """Mark proposals as expired if past expires_at and still in sent status."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        expired = (
            db.query(Proposal)
            .filter(
                Proposal.status == ProposalStatusEnum.SENT,
                Proposal.expires_at.isnot(None),
                Proposal.expires_at < now,
            )
            .all()
        )
        count = 0
        for proposal in expired:
            proposal.status = ProposalStatusEnum.EXPIRED
            proposal.updated_at = now
            db.add(AuditLog(
                organization_id=proposal.organization_id,
                actor_user_id=None,
                action="auto:proposal_expired",
                entity_type="proposal",
                entity_id=proposal.id,
                after_json={
                    "agent": "Secretaria",
                    "detail": f"Propuesta #{proposal.id} marcada como expirada automaticamente",
                    "status": "completed",
                    "type": "info",
                },
            ))
            count += 1
        db.commit()
        return {"expired_count": count}
    finally:
        db.close()


@celery_app.task(name="app.tasks.proposal_tasks.create_followup_tasks")
def create_followup_tasks():
    """Create follow-up tasks for proposals sent 72h ago without follow-up."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        proposals = (
            db.query(Proposal)
            .filter(
                Proposal.status == ProposalStatusEnum.SENT,
                Proposal.followup_due_at.isnot(None),
                Proposal.followup_due_at <= now,
            )
            .all()
        )
        count = 0
        for proposal in proposals:
            existing_task = (
                db.query(Task)
                .filter(
                    Task.entity_type == "proposal",
                    Task.entity_id == proposal.id,
                    Task.task_type == TaskTypeEnum.FOLLOW_UP_PROPOSAL,
                    Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
                )
                .first()
            )
            if not existing_task:
                # AI-generated follow-up message
                fallback_desc = "Contactar cliente para verificar recepcion y lectura de propuesta"
                ai_desc = _ai_draft(
                    f"Redacta un mensaje breve de seguimiento para una propuesta de servicios juridicos "
                    f"enviada hace 72 horas (propuesta #{proposal.id}, monto ${proposal.amount:,} CLP). "
                    f"El objetivo es verificar que el cliente la recibio y resolver dudas. "
                    f"Tono cordial y profesional. Maximo 3 lineas.",
                    fallback_desc,
                )

                task = Task(
                    organization_id=proposal.organization_id,
                    title=f"Seguimiento propuesta #{proposal.id} - 72 horas",
                    description=ai_desc,
                    entity_type="proposal",
                    entity_id=proposal.id,
                    task_type=TaskTypeEnum.FOLLOW_UP_PROPOSAL,
                    assigned_role="administracion",
                    due_at=now,
                    sla_policy=SLAPolicyEnum.PROPOSAL_72H,
                )
                db.add(task)
                db.add(AuditLog(
                    organization_id=proposal.organization_id,
                    actor_user_id=None,
                    action="auto:proposal_followup_created",
                    entity_type="proposal",
                    entity_id=proposal.id,
                    after_json={
                        "agent": "Secretaria",
                        "detail": f"Seguimiento 72h creado para propuesta #{proposal.id}",
                        "detail_long": ai_desc,
                        "status": "completed",
                        "type": "info",
                    },
                ))
                count += 1
        db.commit()
        return {"tasks_created": count}
    finally:
        db.close()
