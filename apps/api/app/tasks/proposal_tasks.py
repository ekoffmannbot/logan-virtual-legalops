from datetime import datetime, timezone

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal
from app.db.models.proposal import Proposal
from app.db.models.task import Task
from app.db.enums import ProposalStatusEnum, TaskTypeEnum, TaskStatusEnum, SLAPolicyEnum


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
                task = Task(
                    organization_id=proposal.organization_id,
                    title=f"Seguimiento propuesta #{proposal.id} - 72 horas",
                    description=f"Contactar cliente para verificar recepción y lectura de propuesta",
                    entity_type="proposal",
                    entity_id=proposal.id,
                    task_type=TaskTypeEnum.FOLLOW_UP_PROPOSAL,
                    assigned_role="administracion",
                    due_at=now,
                    sla_policy=SLAPolicyEnum.PROPOSAL_72H,
                )
                db.add(task)
                count += 1
        db.commit()
        return {"tasks_created": count}
    finally:
        db.close()
