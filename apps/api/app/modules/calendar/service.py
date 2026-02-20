from typing import Optional

from sqlalchemy.orm import Session

from app.db.models.deadline import Deadline
from app.db.models.task import Task
from app.db.models.court_action import CourtAction
from app.db.models.proposal import Proposal
from app.db.models.matter import Matter
from app.db.enums import DeadlineStatusEnum, TaskStatusEnum, ProposalStatusEnum


def get_events(db: Session, org_id: int, start: Optional[str] = None, end: Optional[str] = None) -> list:
    events: list[dict] = []

    # 1. Deadlines (open) -> type="plazo", color="red"
    deadline_query = db.query(Deadline).filter(
        Deadline.organization_id == org_id,
        Deadline.status == DeadlineStatusEnum.OPEN,
    )
    for d in deadline_query.all():
        matter = db.query(Matter).filter(Matter.id == d.matter_id).first() if d.matter_id else None
        events.append({
            "id": f"deadline-{d.id}",
            "title": d.title,
            "date": d.due_at.strftime("%Y-%m-%d") if d.due_at else "",
            "time": d.due_at.strftime("%H:%M") if d.due_at else None,
            "type": "plazo",
            "location": matter.court_name if matter and matter.court_name else None,
            "matterId": str(d.matter_id) if d.matter_id else None,
            "color": "red",
        })

    # 2. Tasks with due_at (open/in_progress) -> type="tarea", color="yellow"
    task_query = db.query(Task).filter(
        Task.organization_id == org_id,
        Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
        Task.due_at.isnot(None),
    )
    for t in task_query.all():
        events.append({
            "id": f"task-{t.id}",
            "title": t.title,
            "date": t.due_at.strftime("%Y-%m-%d") if t.due_at else "",
            "time": t.due_at.strftime("%H:%M") if t.due_at else None,
            "type": "tarea",
            "location": None,
            "matterId": str(t.entity_id) if t.entity_type == "matter" else None,
            "color": "yellow",
        })

    # 3. CourtActions with dates -> type="audiencia", color="blue"
    #    CourtAction has sent_at and receipt_confirmed_at; no court_date field.
    #    Use sent_at as primary date, fall back to created_at (from TimestampMixin).
    court_query = db.query(CourtAction).filter(
        CourtAction.organization_id == org_id,
    )
    for ca in court_query.all():
        date_val = ca.sent_at or getattr(ca, "created_at", None)
        if date_val:
            matter = db.query(Matter).filter(Matter.id == ca.matter_id).first() if ca.matter_id else None
            events.append({
                "id": f"court-{ca.id}",
                "title": ca.description or "Gestion judicial",
                "date": date_val.strftime("%Y-%m-%d"),
                "time": date_val.strftime("%H:%M") if date_val else None,
                "type": "audiencia",
                "location": matter.court_name if matter and matter.court_name else None,
                "matterId": str(ca.matter_id) if ca.matter_id else None,
                "color": "blue",
            })

    # 4. Proposals with followup_due_at -> type="seguimiento", color="green"
    prop_query = db.query(Proposal).filter(
        Proposal.organization_id == org_id,
        Proposal.status == ProposalStatusEnum.SENT,
        Proposal.followup_due_at.isnot(None),
    )
    for p in prop_query.all():
        events.append({
            "id": f"proposal-{p.id}",
            "title": f"Seguimiento propuesta #{p.id}",
            "date": p.followup_due_at.strftime("%Y-%m-%d") if p.followup_due_at else "",
            "time": p.followup_due_at.strftime("%H:%M") if p.followup_due_at else None,
            "type": "seguimiento",
            "location": None,
            "matterId": str(p.matter_id) if p.matter_id else None,
            "color": "green",
        })

    # Sort all events by date
    events.sort(key=lambda e: e.get("date", ""))

    return events
