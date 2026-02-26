"""
Reports & Analytics service for Logan Virtual.

Generates comprehensive business intelligence reports with real database queries.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import date, datetime, timedelta, timezone

from fastapi.responses import StreamingResponse
from sqlalchemy import func, case, and_, extract
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _date_filter(query, model, field_name: str, start_date: date | None, end_date: date | None):
    """Apply date range filter to a query."""
    field = getattr(model, field_name)
    if start_date:
        query = query.filter(field >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(field <= datetime.combine(end_date, datetime.max.time()))
    return query


def get_productivity_report(
    db: Session, org_id: int,
    start_date: date | None = None,
    end_date: date | None = None,
    lawyer_id: int | None = None,
) -> dict:
    """Productivity by lawyer: tasks done, matters active, proposals sent."""
    from app.db.models.task import Task
    from app.db.models.matter import Matter
    from app.db.models.proposal import Proposal
    from app.db.models.user import User
    from app.db.enums import TaskStatusEnum, RoleEnum

    # Get lawyers
    lawyers_q = db.query(User).filter(
        User.organization_id == org_id,
        User.active.is_(True),
        User.role.in_([RoleEnum.ABOGADO.value, RoleEnum.ABOGADO_JEFE.value, RoleEnum.PROCURADOR.value]),
    )
    if lawyer_id:
        lawyers_q = lawyers_q.filter(User.id == lawyer_id)
    lawyers = lawyers_q.all()

    result = []
    for lawyer in lawyers:
        # Tasks completed
        tasks_q = db.query(func.count(Task.id)).filter(
            Task.organization_id == org_id,
            Task.assigned_to_user_id == lawyer.id,
            Task.status == TaskStatusEnum.DONE.value,
        )
        tasks_q = _date_filter(tasks_q, Task, "updated_at", start_date, end_date)
        tasks_done = tasks_q.scalar() or 0

        # Tasks open
        tasks_open = db.query(func.count(Task.id)).filter(
            Task.organization_id == org_id,
            Task.assigned_to_user_id == lawyer.id,
            Task.status.in_([TaskStatusEnum.OPEN.value, TaskStatusEnum.IN_PROGRESS.value]),
        ).scalar() or 0

        # Active matters
        matters_active = db.query(func.count(Matter.id)).filter(
            Matter.organization_id == org_id,
            Matter.assigned_lawyer_id == lawyer.id,
            Matter.status == "open",
        ).scalar() or 0

        # Proposals sent
        proposals_q = db.query(func.count(Proposal.id)).filter(
            Proposal.organization_id == org_id,
            Proposal.created_by_user_id == lawyer.id,
        )
        proposals_q = _date_filter(proposals_q, Proposal, "created_at", start_date, end_date)
        proposals_sent = proposals_q.scalar() or 0

        result.append({
            "lawyer_id": lawyer.id,
            "lawyer_name": lawyer.full_name,
            "role": lawyer.role,
            "tasks_completed": tasks_done,
            "tasks_open": tasks_open,
            "matters_active": matters_active,
            "proposals_created": proposals_sent,
        })

    return {
        "report_type": "productivity",
        "period": {"start": str(start_date) if start_date else None, "end": str(end_date) if end_date else None},
        "data": result,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_financial_report(
    db: Session, org_id: int,
    start_date: date | None = None, end_date: date | None = None,
) -> dict:
    """Financial overview: invoiced, collected, pending, overdue amounts."""
    from app.db.models.invoice import Invoice
    from app.db.enums import InvoiceStatusEnum

    base_q = db.query(Invoice).filter(Invoice.organization_id == org_id)
    base_q = _date_filter(base_q, Invoice, "created_at", start_date, end_date)

    # Total invoiced
    total_invoiced = db.query(func.sum(Invoice.amount)).filter(
        Invoice.organization_id == org_id,
    ).scalar() or 0

    # Collected (paid)
    total_collected = db.query(func.sum(Invoice.amount)).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatusEnum.PAID.value,
    ).scalar() or 0

    # Overdue
    total_overdue = db.query(func.sum(Invoice.amount)).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatusEnum.OVERDUE.value,
    ).scalar() or 0

    # Pending (due but not overdue)
    total_pending = db.query(func.sum(Invoice.amount)).filter(
        Invoice.organization_id == org_id,
        Invoice.status.in_([InvoiceStatusEnum.SCHEDULED.value, InvoiceStatusEnum.DUE.value]),
    ).scalar() or 0

    # By month
    monthly = db.query(
        extract("year", Invoice.created_at).label("year"),
        extract("month", Invoice.created_at).label("month"),
        func.sum(Invoice.amount).label("total"),
        func.count(Invoice.id).label("count"),
    ).filter(
        Invoice.organization_id == org_id,
    ).group_by("year", "month").order_by("year", "month").all()

    return {
        "report_type": "financial",
        "period": {"start": str(start_date) if start_date else None, "end": str(end_date) if end_date else None},
        "summary": {
            "total_invoiced": float(total_invoiced),
            "total_collected": float(total_collected),
            "total_overdue": float(total_overdue),
            "total_pending": float(total_pending),
            "collection_rate": round(float(total_collected) / float(total_invoiced) * 100, 1) if total_invoiced else 0,
        },
        "monthly": [
            {"year": int(m.year), "month": int(m.month), "total": float(m.total), "count": m.count}
            for m in monthly
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_sla_compliance_report(
    db: Session, org_id: int,
    start_date: date | None = None, end_date: date | None = None,
) -> dict:
    """SLA compliance: email response times and breach rates."""
    from app.db.models.email_ticket import EmailTicket
    from app.db.enums import EmailTicketStatusEnum

    base_q = db.query(EmailTicket).filter(EmailTicket.organization_id == org_id)
    base_q = _date_filter(base_q, EmailTicket, "created_at", start_date, end_date)

    total = base_q.count()
    breached_24h = base_q.filter(
        EmailTicket.status == EmailTicketStatusEnum.SLA_BREACHED_24H.value
    ).count()
    breached_48h = base_q.filter(
        EmailTicket.status == EmailTicketStatusEnum.SLA_BREACHED_48H.value
    ).count()
    resolved = base_q.filter(
        EmailTicket.status.in_([EmailTicketStatusEnum.SENT.value, EmailTicketStatusEnum.CLOSED.value])
    ).count()

    return {
        "report_type": "sla_compliance",
        "period": {"start": str(start_date) if start_date else None, "end": str(end_date) if end_date else None},
        "summary": {
            "total_tickets": total,
            "resolved": resolved,
            "breached_24h": breached_24h,
            "breached_48h": breached_48h,
            "compliance_rate": round((total - breached_24h - breached_48h) / total * 100, 1) if total else 100,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_lead_conversion_report(
    db: Session, org_id: int,
    start_date: date | None = None, end_date: date | None = None,
) -> dict:
    """Lead conversion funnel by source."""
    from app.db.models.lead import Lead
    from app.db.enums import LeadStatusEnum, LeadSourceEnum

    base_q = db.query(Lead).filter(Lead.organization_id == org_id)
    base_q = _date_filter(base_q, Lead, "created_at", start_date, end_date)

    # By status
    status_counts = db.query(
        Lead.status, func.count(Lead.id)
    ).filter(Lead.organization_id == org_id).group_by(Lead.status).all()

    # By source
    source_counts = db.query(
        Lead.source, func.count(Lead.id)
    ).filter(Lead.organization_id == org_id).group_by(Lead.source).all()

    total = sum(c for _, c in status_counts) if status_counts else 0
    won = next((c for s, c in status_counts if s == LeadStatusEnum.WON.value), 0)

    return {
        "report_type": "lead_conversion",
        "period": {"start": str(start_date) if start_date else None, "end": str(end_date) if end_date else None},
        "funnel": {s: c for s, c in status_counts},
        "by_source": {s: c for s, c in source_counts},
        "summary": {
            "total_leads": total,
            "converted": won,
            "conversion_rate": round(won / total * 100, 1) if total else 0,
        },
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def get_collections_aging_report(db: Session, org_id: int) -> dict:
    """Collections aging: 0-30, 31-60, 61-90, 90+ days overdue."""
    from app.db.models.invoice import Invoice
    from app.db.enums import InvoiceStatusEnum

    now = datetime.now(timezone.utc)

    overdue_invoices = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatusEnum.OVERDUE.value,
    ).all()

    buckets = {"0-30": {"count": 0, "amount": 0}, "31-60": {"count": 0, "amount": 0},
               "61-90": {"count": 0, "amount": 0}, "90+": {"count": 0, "amount": 0}}

    for inv in overdue_invoices:
        due = inv.due_date if hasattr(inv, "due_date") and inv.due_date else None
        if due is None:
            days = 0
        elif hasattr(due, "date"):
            days = (now.date() - due.date()).days
        else:
            days = (now.date() - due).days
        amount = float(inv.amount) if inv.amount else 0
        if days <= 30:
            buckets["0-30"]["count"] += 1
            buckets["0-30"]["amount"] += amount
        elif days <= 60:
            buckets["31-60"]["count"] += 1
            buckets["31-60"]["amount"] += amount
        elif days <= 90:
            buckets["61-90"]["count"] += 1
            buckets["61-90"]["amount"] += amount
        else:
            buckets["90+"]["count"] += 1
            buckets["90+"]["amount"] += amount

    return {
        "report_type": "collections_aging",
        "buckets": buckets,
        "total_overdue": sum(b["amount"] for b in buckets.values()),
        "total_count": sum(b["count"] for b in buckets.values()),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def export_report(
    db: Session, org_id: int, report_type: str, format: str,
    start_date: date | None = None, end_date: date | None = None,
):
    """Export a report as JSON or CSV."""
    report_funcs = {
        "productivity": get_productivity_report,
        "financial": get_financial_report,
        "sla-compliance": get_sla_compliance_report,
        "lead-conversion": get_lead_conversion_report,
        "collections-aging": lambda db, org_id, *a, **kw: get_collections_aging_report(db, org_id),
    }

    func_ = report_funcs.get(report_type)
    if not func_:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Tipo de reporte no válido: {report_type}")

    data = func_(db, org_id, start_date, end_date)

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        # Flatten the data for CSV
        rows = data.get("data") or [data.get("summary", {})]
        if rows and isinstance(rows, list) and len(rows) > 0:
            writer.writerow(rows[0].keys() if isinstance(rows[0], dict) else ["value"])
            for row in rows:
                writer.writerow(row.values() if isinstance(row, dict) else [row])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=report_{report_type}.csv"},
        )

    return data
