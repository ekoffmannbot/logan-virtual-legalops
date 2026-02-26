from datetime import datetime, timezone, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    Lead, Matter, Proposal, Task, Deadline, Invoice, User,
    Client, EmailTicket, Contract, NotaryDocument, AuditLog,
)
from app.db.enums import (
    LeadStatusEnum,
    MatterStatusEnum,
    ProposalStatusEnum,
    TaskStatusEnum,
    DeadlineSeverityEnum,
    DeadlineStatusEnum,
    InvoiceStatusEnum,
    EmailTicketStatusEnum,
    ContractStatusEnum,
    NotaryDocStatusEnum,
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


def get_action_items(db: Session, org_id: int) -> dict:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    urgent: list[dict] = []
    today_items: list[dict] = []
    in_progress: list[dict] = []
    completed: list[dict] = []
    agent_insights: list[dict] = []

    # ── URGENT: Overdue invoices ──────────────────────────────────────────
    overdue_invoices = (
        db.query(Invoice)
        .filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatusEnum.OVERDUE,
        )
        .limit(5)
        .all()
    )

    for inv in overdue_invoices:
        client = (
            db.query(Client).filter(Client.id == inv.client_id).first()
        )
        client_name = client.full_name_or_company if client else "Cliente"
        days_overdue = (now.date() - inv.due_date).days if inv.due_date else 0
        urgent.append({
            "id": f"inv-{inv.id}",
            "type": "invoice",
            "title": f"Factura vencida: {client_name}",
            "subtitle": f"${inv.amount:,.0f}" if inv.amount else "",
            "urgencyText": f"Vencida hace {days_overdue} {'dia' if days_overdue == 1 else 'dias'}",
            "actionLabel": "Gestionar Cobro",
            "actionHref": "/collections",
            "secondaryLabel": "Ver Factura",
            "secondaryHref": "/collections",
            "amount": f"${inv.amount:,.0f}" if inv.amount else None,
        })

    # ── URGENT: Email tickets near SLA breach ─────────────────────────────
    sla_tickets = (
        db.query(EmailTicket)
        .filter(
            EmailTicket.organization_id == org_id,
            EmailTicket.status.in_([
                EmailTicketStatusEnum.NEW,
                EmailTicketStatusEnum.DRAFTING,
            ]),
            EmailTicket.sla_due_24h_at.isnot(None),
            EmailTicket.sla_due_24h_at <= now + timedelta(hours=6),
        )
        .limit(5)
        .all()
    )

    for et in sla_tickets:
        hours_left = (
            max(0, (et.sla_due_24h_at - now).total_seconds() / 3600)
            if et.sla_due_24h_at
            else 0
        )
        urgent.append({
            "id": f"et-{et.id}",
            "type": "email_ticket",
            "title": f"SLA por vencer: {et.subject}",
            "subtitle": et.from_email or "",
            "urgencyText": (
                f"Quedan {int(hours_left)}h para responder"
                if hours_left > 0
                else "SLA vencido"
            ),
            "actionLabel": "Responder",
            "actionHref": "/email-tickets",
        })

    # ── URGENT: New leads without contact > 4 hours ───────────────────────
    stale_leads = (
        db.query(Lead)
        .filter(
            Lead.organization_id == org_id,
            Lead.status == LeadStatusEnum.NEW,
            Lead.created_at <= now - timedelta(hours=4),
        )
        .limit(5)
        .all()
    )

    for lead in stale_leads:
        hours_since = (
            (now - lead.created_at).total_seconds() / 3600
            if lead.created_at
            else 0
        )
        urgent.append({
            "id": f"lead-{lead.id}",
            "type": "lead",
            "title": f"Lead sin contactar: {lead.full_name}",
            "subtitle": lead.email or lead.phone or "",
            "urgencyText": f"Sin contacto hace {int(hours_since)} horas",
            "actionLabel": "Llamar",
            "actionHref": "/leads",
        })

    # ── TODAY: Open tasks due today ───────────────────────────────────────
    today_tasks = (
        db.query(Task)
        .filter(
            Task.organization_id == org_id,
            Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]),
            Task.due_at >= today_start,
            Task.due_at < today_end,
        )
        .limit(5)
        .all()
    )

    for t in today_tasks:
        today_items.append({
            "id": f"task-{t.id}",
            "type": "task",
            "title": t.title,
            "subtitle": t.description[:80] if t.description else "",
            "actionLabel": "Ver Tarea",
            "actionHref": "/tasks",
        })

    # ── TODAY: Case review (open matters count) ───────────────────────────
    open_matter_count = (
        db.query(func.count(Matter.id))
        .filter(
            Matter.organization_id == org_id,
            Matter.status == MatterStatusEnum.OPEN,
        )
        .scalar()
        or 0
    )

    if open_matter_count > 0:
        today_items.append({
            "id": "t-case-review",
            "type": "case_review",
            "title": "Revision diaria de causas",
            "subtitle": f"{open_matter_count} causas pendientes de revision",
            "actionLabel": "Iniciar Revision",
            "actionHref": "/case-review",
        })

    # ── TODAY: Proposal follow-ups due ────────────────────────────────────
    followup_proposals = (
        db.query(Proposal)
        .filter(
            Proposal.organization_id == org_id,
            Proposal.status == ProposalStatusEnum.SENT,
            Proposal.followup_due_at.isnot(None),
            Proposal.followup_due_at <= now,
        )
        .limit(5)
        .all()
    )

    for p in followup_proposals:
        today_items.append({
            "id": f"prop-{p.id}",
            "type": "proposal",
            "title": f"Seguimiento 72h: Propuesta #{p.id}",
            "subtitle": f"${p.amount:,.0f}" if p.amount else "",
            "actionLabel": "Contactar",
            "actionHref": "/proposals",
        })

    # ── IN PROGRESS: Contracts mid-workflow ───────────────────────────────
    active_contracts = (
        db.query(Contract)
        .filter(
            Contract.organization_id == org_id,
            Contract.status.in_([
                ContractStatusEnum.DRAFTING,
                ContractStatusEnum.PENDING_REVIEW,
                ContractStatusEnum.CHANGES_REQUESTED,
                ContractStatusEnum.APPROVED,
                ContractStatusEnum.UPLOADED_FOR_SIGNING,
            ]),
        )
        .limit(5)
        .all()
    )

    for c in active_contracts:
        client = (
            db.query(Client).filter(Client.id == c.client_id).first()
        )
        client_name = client.full_name_or_company if client else ""
        status_val = c.status if isinstance(c.status, str) else c.status.value
        in_progress.append({
            "id": f"contract-{c.id}",
            "type": "contract",
            "title": f"Contrato {client_name}",
            "subtitle": f"Estado: {status_val}",
            "processId": "contrato-mandato",
            "status": status_val,
            "href": "/contracts",
        })

    # ── IN PROGRESS: Notary docs at notary ────────────────────────────────
    active_notary = (
        db.query(NotaryDocument)
        .filter(
            NotaryDocument.organization_id == org_id,
            NotaryDocument.status.in_([
                NotaryDocStatusEnum.SENT_TO_NOTARY,
                NotaryDocStatusEnum.NOTARY_RECEIVED,
                NotaryDocStatusEnum.CLIENT_CONTACT_PENDING,
            ]),
        )
        .limit(5)
        .all()
    )

    for nd in active_notary:
        client = (
            db.query(Client).filter(Client.id == nd.client_id).first()
        )
        client_name = client.full_name_or_company if client else ""
        status_val = (
            nd.status if isinstance(nd.status, str) else nd.status.value
        )
        in_progress.append({
            "id": f"notary-{nd.id}",
            "type": "notary",
            "title": f"Doc. notarial {client_name}",
            "subtitle": nd.notary_name or "",
            "processId": "documentos-notariales",
            "status": status_val,
            "href": "/notary",
        })

    # ── COMPLETED: Tasks completed today ──────────────────────────────────
    completed_tasks = (
        db.query(Task)
        .filter(
            Task.organization_id == org_id,
            Task.status == TaskStatusEnum.DONE,
            Task.completed_at >= today_start,
        )
        .limit(5)
        .all()
    )

    for t in completed_tasks:
        time_str = t.completed_at.strftime("%H:%M") if t.completed_at else ""
        completed.append({
            "id": f"done-{t.id}",
            "title": t.title,
            "subtitle": f"Completado a las {time_str}",
            "type": "task",
        })

    # ── AGENT INSIGHTS: From AuditLog (system actions) ────────────────────
    agent_logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.organization_id == org_id,
            AuditLog.actor_user_id.is_(None),
            AuditLog.created_at >= now - timedelta(hours=24),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(5)
        .all()
    )

    for al in agent_logs:
        after = al.after_json or {}
        agent_name = after.get("agent", "Sistema")
        detail = after.get("detail", al.action)
        insight_type = after.get("type", "info")
        agent_insights.append({
            "agentName": agent_name,
            "message": detail,
            "type": insight_type,
        })

    # If no real agent insights, add a default
    if not agent_insights:
        agent_insights.append({
            "agentName": "Sistema",
            "message": "Todos los procesos automaticos estan al dia.",
            "type": "info",
        })

    # ── QUICK NUMBERS ─────────────────────────────────────────────────────
    quick_numbers = {
        "leads": (
            db.query(func.count(Lead.id))
            .filter(
                Lead.organization_id == org_id,
                Lead.status == LeadStatusEnum.NEW,
            )
            .scalar()
            or 0
        ),
        "proposals": (
            db.query(func.count(Proposal.id))
            .filter(
                Proposal.organization_id == org_id,
                Proposal.status.in_([
                    ProposalStatusEnum.DRAFT,
                    ProposalStatusEnum.SENT,
                ]),
            )
            .scalar()
            or 0
        ),
        "matters": (
            db.query(func.count(Matter.id))
            .filter(
                Matter.organization_id == org_id,
                Matter.status == MatterStatusEnum.OPEN,
            )
            .scalar()
            or 0
        ),
        "overdue": (
            db.query(func.count(Invoice.id))
            .filter(
                Invoice.organization_id == org_id,
                Invoice.status == InvoiceStatusEnum.OVERDUE,
            )
            .scalar()
            or 0
        ),
    }

    return {
        "urgent": urgent,
        "today": today_items,
        "inProgress": in_progress,
        "completed": completed,
        "agentInsights": agent_insights,
        "quickNumbers": quick_numbers,
    }


def get_stats(db: Session, org_id: int) -> dict:
    """Dashboard stats with week-over-week trend calculations."""
    now = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    def _count(model, filter_cond, since=None):
        q = db.query(func.count(model.id)).filter(
            model.organization_id == org_id,
            filter_cond,
        )
        if since:
            q = q.filter(model.created_at >= since)
        return q.scalar() or 0

    # Current counts
    open_matters = _count(Matter, Matter.status == MatterStatusEnum.OPEN)
    active_leads = _count(Lead, Lead.status.in_([LeadStatusEnum.NEW, LeadStatusEnum.CONTACTED]))
    overdue_invoices = _count(Invoice, Invoice.status == InvoiceStatusEnum.OVERDUE)
    pending_tasks = _count(Task, Task.status.in_([TaskStatusEnum.OPEN, TaskStatusEnum.IN_PROGRESS]))

    # Totals for collection rate
    total_invoiced = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(Invoice.organization_id == org_id)
        .scalar()
    ) or 0
    total_collected = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(Invoice.organization_id == org_id, Invoice.status == InvoiceStatusEnum.PAID)
        .scalar()
    ) or 0

    # Week-over-week trends (new items this week vs last week)
    leads_this_week = _count(Lead, Lead.id > 0, since=one_week_ago)
    leads_last_week = (
        db.query(func.count(Lead.id))
        .filter(
            Lead.organization_id == org_id,
            Lead.created_at >= two_weeks_ago,
            Lead.created_at < one_week_ago,
        )
        .scalar() or 0
    )

    matters_this_week = _count(Matter, Matter.id > 0, since=one_week_ago)
    matters_last_week = (
        db.query(func.count(Matter.id))
        .filter(
            Matter.organization_id == org_id,
            Matter.created_at >= two_weeks_ago,
            Matter.created_at < one_week_ago,
        )
        .scalar() or 0
    )

    def _trend_pct(current, previous):
        if previous == 0:
            return 0 if current == 0 else 100
        return round(((current - previous) / previous) * 100)

    # Matters by type and leads by status for charts
    matters_rows = (
        db.query(Matter.matter_type, func.count(Matter.id).label("cnt"))
        .filter(Matter.organization_id == org_id)
        .group_by(Matter.matter_type)
        .all()
    )
    matters_by_type = {
        (r.matter_type if isinstance(r.matter_type, str) else r.matter_type.value): r.cnt
        for r in matters_rows
    }

    leads_rows = (
        db.query(Lead.status, func.count(Lead.id).label("cnt"))
        .filter(Lead.organization_id == org_id)
        .group_by(Lead.status)
        .all()
    )
    leads_by_status = {
        (r.status if isinstance(r.status, str) else r.status.value): r.cnt
        for r in leads_rows
    }

    return {
        "open_matters": open_matters,
        "active_leads": active_leads,
        "overdue_invoices": overdue_invoices,
        "pending_tasks": pending_tasks,
        "total_invoiced": total_invoiced,
        "total_collected": total_collected,
        "collection_rate": round((total_collected / total_invoiced * 100), 1) if total_invoiced > 0 else 0,
        "matters_by_type": matters_by_type,
        "leads_by_status": leads_by_status,
        "trends": {
            "leads": _trend_pct(leads_this_week, leads_last_week),
            "matters": _trend_pct(matters_this_week, matters_last_week),
        },
    }
