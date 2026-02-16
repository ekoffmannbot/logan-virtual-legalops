from datetime import datetime, timezone, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Lead, Matter, Proposal, Task, Deadline, Invoice, User
from app.db.enums import (
    LeadStatusEnum,
    MatterStatusEnum,
    ProposalStatusEnum,
    TaskStatusEnum,
    DeadlineSeverityEnum,
    DeadlineStatusEnum,
    InvoiceStatusEnum,
)
from app.modules.dashboards.schemas import (
    DashboardOverview,
    KPIs,
    LeadsByStatus,
    MattersByType,
    OverdueTaskItem,
    CriticalDeadlineItem,
)


def get_overview(db: Session, org_id: int) -> DashboardOverview:
    now = datetime.now(timezone.utc)
    seven_days_ahead = now + timedelta(days=7)

    # ── KPIs ─────────────────────────────────────────────────────────────
    new_leads = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.organization_id == org_id,
            Lead.status == LeadStatusEnum.NEW,
        )
        .scalar()
    ) or 0

    active_proposals = (
        db.query(func.count(Proposal.id))
        .filter(
            Proposal.organization_id == org_id,
            Proposal.status.in_([
                ProposalStatusEnum.DRAFT,
                ProposalStatusEnum.SENT,
            ]),
        )
        .scalar()
    ) or 0

    open_matters = (
        db.query(func.count(Matter.id))
        .filter(
            Matter.organization_id == org_id,
            Matter.status == MatterStatusEnum.OPEN,
        )
        .scalar()
    ) or 0

    overdue_invoices = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatusEnum.OVERDUE,
        )
        .scalar()
    ) or 0

    kpis = KPIs(
        new_leads=new_leads,
        active_proposals=active_proposals,
        open_matters=open_matters,
        overdue_invoices=overdue_invoices,
    )

    # ── Leads by status (group-by) ───────────────────────────────────────
    leads_rows = (
        db.query(
            Lead.status,
            func.count(Lead.id).label("cnt"),
        )
        .filter(Lead.organization_id == org_id)
        .group_by(Lead.status)
        .all()
    )
    leads_by_status = [
        LeadsByStatus(
            status=row.status if isinstance(row.status, str) else row.status.value,
            count=row.cnt,
        )
        for row in leads_rows
    ]

    # ── Matters by type (group-by) ───────────────────────────────────────
    matters_rows = (
        db.query(
            Matter.matter_type,
            func.count(Matter.id).label("cnt"),
        )
        .filter(Matter.organization_id == org_id)
        .group_by(Matter.matter_type)
        .all()
    )
    matters_by_type = [
        MattersByType(
            type=row.matter_type if isinstance(row.matter_type, str) else row.matter_type.value,
            count=row.cnt,
        )
        for row in matters_rows
    ]

    # ── Overdue tasks ────────────────────────────────────────────────────
    # Join with User for assigned_to_name, outerjoin with Matter via
    # entity_type='matter' for matter_title.
    overdue_rows = (
        db.query(
            Task.id,
            Task.title,
            Task.due_at,
            User.full_name.label("assigned_to_name"),
            Matter.title.label("matter_title"),
        )
        .outerjoin(User, Task.assigned_to_user_id == User.id)
        .outerjoin(
            Matter,
            (Task.entity_type == "matter") & (Task.entity_id == Matter.id),
        )
        .filter(
            Task.organization_id == org_id,
            Task.status.in_([
                TaskStatusEnum.OPEN,
                TaskStatusEnum.IN_PROGRESS,
            ]),
            Task.due_at < now,
        )
        .order_by(Task.due_at.asc())
        .limit(10)
        .all()
    )
    overdue_tasks = [
        OverdueTaskItem(
            id=row.id,
            title=row.title,
            due_date=row.due_at.isoformat() if row.due_at else "",
            assigned_to_name=row.assigned_to_name or "Sin asignar",
            matter_title=row.matter_title,
        )
        for row in overdue_rows
    ]

    # ── Critical deadlines ───────────────────────────────────────────────
    # Open deadlines within the next 7 days with high/critical severity.
    # Outerjoin Matter to get matter_title.
    deadline_rows = (
        db.query(
            Deadline.id,
            Deadline.title,
            Deadline.due_at,
            Deadline.severity,
            Matter.title.label("matter_title"),
        )
        .outerjoin(Matter, Deadline.matter_id == Matter.id)
        .filter(
            Deadline.organization_id == org_id,
            Deadline.status == DeadlineStatusEnum.OPEN,
            Deadline.due_at <= seven_days_ahead,
            Deadline.severity.in_([
                DeadlineSeverityEnum.HIGH,
                DeadlineSeverityEnum.CRITICAL,
            ]),
        )
        .order_by(Deadline.due_at.asc())
        .limit(10)
        .all()
    )
    critical_deadlines = [
        CriticalDeadlineItem(
            id=row.id,
            title=row.title,
            due_date=row.due_at.isoformat() if row.due_at else "",
            severity=row.severity if isinstance(row.severity, str) else row.severity.value,
            matter_title=row.matter_title,
        )
        for row in deadline_rows
    ]

    return DashboardOverview(
        kpis=kpis,
        leads_by_status=leads_by_status,
        matters_by_type=matters_by_type,
        overdue_tasks=overdue_tasks,
        critical_deadlines=critical_deadlines,
    )
