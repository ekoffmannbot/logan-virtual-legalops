from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import Invoice, Payment, CollectionCase, Client, Matter, User, AuditLog
from app.db.enums import InvoiceStatusEnum, PaymentMethodEnum, CollectionCaseStatusEnum
from app.modules.collections.schemas import PaymentCreate, InvoiceTransitionRequest


# ── Invoice status transitions ─────────────────────────────────────────────

INVOICE_TRANSITIONS: dict[str, dict[str, str]] = {
    # action -> { from_status -> to_status }  (None from_status means any)
    "mark_due": {"scheduled": InvoiceStatusEnum.DUE.value},
    "mark_overdue": {"due": InvoiceStatusEnum.OVERDUE.value},
    "mark_paid": {"scheduled": InvoiceStatusEnum.PAID.value, "due": InvoiceStatusEnum.PAID.value, "overdue": InvoiceStatusEnum.PAID.value},
    "cancel": {"scheduled": InvoiceStatusEnum.CANCELLED.value, "due": InvoiceStatusEnum.CANCELLED.value, "overdue": InvoiceStatusEnum.CANCELLED.value},
}


# ── Helpers ─────────────────────────────────────────────────────────────────

def _invoice_number(invoice_id: int) -> str:
    return f"FAC-{invoice_id:05d}"


def _get_invoice_or_404(db: Session, invoice_id: int, org_id: int) -> Invoice:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.organization_id == org_id)
        .first()
    )
    if not invoice:
        raise HTTPException(status_code=404, detail="Factura no encontrada")
    return invoice


def _amount_paid_for_invoice(db: Session, invoice_id: int) -> int:
    total = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .filter(Payment.invoice_id == invoice_id)
        .scalar()
    )
    return int(total)


def _client_name(db: Session, client_id: int) -> str:
    client = db.query(Client.full_name_or_company).filter(Client.id == client_id).scalar()
    return client or "—"


def _matter_title(db: Session, matter_id: Optional[int]) -> Optional[str]:
    if not matter_id:
        return None
    title = db.query(Matter.title).filter(Matter.id == matter_id).scalar()
    return title


# ── List invoices ──────────────────────────────────────────────────────────

def list_invoices(
    db: Session,
    org_id: int,
    status: Optional[str] = None,
    client_id: Optional[int] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[dict]:
    q = (
        db.query(Invoice, Client.full_name_or_company, Matter.title)
        .outerjoin(Client, Client.id == Invoice.client_id)
        .outerjoin(Matter, Matter.id == Invoice.matter_id)
        .filter(Invoice.organization_id == org_id)
    )
    if status:
        q = q.filter(Invoice.status == status)
    if client_id:
        q = q.filter(Invoice.client_id == client_id)

    rows = q.order_by(Invoice.due_date.asc()).offset(skip).limit(limit).all()

    results = []
    for inv, client_full_name, m_title in rows:
        results.append({
            "id": inv.id,
            "client_name": client_full_name or "—",
            "amount": inv.amount,
            "currency": inv.currency,
            "due_date": inv.due_date,
            "status": inv.status if isinstance(inv.status, str) else inv.status.value,
            "matter_title": m_title,
            "invoice_number": _invoice_number(inv.id),
            "created_at": inv.created_at,
        })
    return results


# ── Get invoice detail ─────────────────────────────────────────────────────

def get_invoice_detail(db: Session, invoice_id: int, org_id: int) -> dict:
    row = (
        db.query(Invoice, Client.full_name_or_company, Matter.title)
        .outerjoin(Client, Client.id == Invoice.client_id)
        .outerjoin(Matter, Matter.id == Invoice.matter_id)
        .filter(Invoice.id == invoice_id, Invoice.organization_id == org_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Factura no encontrada")

    inv, client_full_name, m_title = row
    amount_paid = _amount_paid_for_invoice(db, inv.id)

    return {
        "id": inv.id,
        "invoice_number": _invoice_number(inv.id),
        "client_name": client_full_name or "—",
        "client_id": inv.client_id,
        "matter_id": inv.matter_id,
        "matter_title": m_title,
        "amount": inv.amount,
        "amount_paid": amount_paid,
        "currency": inv.currency,
        "due_date": inv.due_date,
        "status": inv.status if isinstance(inv.status, str) else inv.status.value,
        "description": None,
        "created_at": inv.created_at,
        "updated_at": inv.updated_at,
    }


# ── Invoice transition ─────────────────────────────────────────────────────

def transition_invoice(
    db: Session,
    invoice_id: int,
    data: InvoiceTransitionRequest,
    org_id: int,
    actor_user_id: int,
) -> dict:
    invoice = _get_invoice_or_404(db, invoice_id, org_id)
    action = data.action

    action_map = INVOICE_TRANSITIONS.get(action)
    if not action_map:
        raise HTTPException(status_code=400, detail=f"Accion invalida: {action}")

    current_status = invoice.status if isinstance(invoice.status, str) else invoice.status.value
    new_status = action_map.get(current_status)
    if not new_status:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede ejecutar '{action}' desde el estado '{current_status}'",
        )

    old_status = current_status
    invoice.status = new_status
    db.commit()
    db.refresh(invoice)

    # Log the transition in audit_logs
    audit = AuditLog(
        organization_id=org_id,
        actor_user_id=actor_user_id,
        action=f"invoice.{action}",
        entity_type="invoice",
        entity_id=invoice.id,
        before_json={"status": old_status},
        after_json={"status": new_status},
    )
    db.add(audit)
    db.commit()

    return get_invoice_detail(db, invoice_id, org_id)


# ── Payments ───────────────────────────────────────────────────────────────

def register_payment(
    db: Session,
    invoice_id: int,
    data: PaymentCreate,
    org_id: int,
    actor_user_id: int,
) -> dict:
    invoice = _get_invoice_or_404(db, invoice_id, org_id)

    # Resolve method enum if provided
    payment_method = None
    if data.method:
        try:
            payment_method = PaymentMethodEnum(data.method)
        except ValueError:
            payment_method = data.method

    payment = Payment(
        organization_id=org_id,
        invoice_id=invoice.id,
        amount=data.amount,
        paid_at=datetime.now(timezone.utc),
        reference_text=data.notes,
    )
    db.add(payment)
    db.flush()

    # Check if total payments cover the invoice
    total = _amount_paid_for_invoice(db, invoice.id)
    if total >= invoice.amount:
        invoice.status = InvoiceStatusEnum.PAID

    db.commit()
    db.refresh(payment)

    # Get actor name
    actor_name = db.query(User.full_name).filter(User.id == actor_user_id).scalar()

    return {
        "id": payment.id,
        "amount": payment.amount,
        "currency": invoice.currency,
        "method": data.method,
        "notes": payment.reference_text,
        "recorded_by": actor_name,
        "created_at": payment.created_at,
    }


def list_payments(
    db: Session,
    invoice_id: int,
    org_id: int,
) -> List[dict]:
    _get_invoice_or_404(db, invoice_id, org_id)

    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()

    payments = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .order_by(Payment.paid_at.desc())
        .all()
    )

    results = []
    for p in payments:
        results.append({
            "id": p.id,
            "amount": p.amount,
            "currency": invoice.currency if invoice else "CLP",
            "method": None,
            "notes": p.reference_text,
            "recorded_by": None,
            "created_at": p.created_at,
        })
    return results


# ── Collection cases ───────────────────────────────────────────────────────

def list_collection_cases(
    db: Session,
    org_id: int,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[dict]:
    q = (
        db.query(CollectionCase, Invoice, Client.full_name_or_company)
        .join(Invoice, Invoice.id == CollectionCase.invoice_id)
        .outerjoin(Client, Client.id == Invoice.client_id)
        .filter(CollectionCase.organization_id == org_id)
    )
    if status:
        q = q.filter(CollectionCase.status == status)

    rows = q.order_by(CollectionCase.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for case, inv, client_full_name in rows:
        results.append({
            "id": case.id,
            "invoice_id": case.invoice_id,
            "invoice_number": _invoice_number(inv.id),
            "client_name": client_full_name or "—",
            "status": case.status if isinstance(case.status, str) else case.status.value,
            "last_contact_at": case.last_contact_at,
            "next_action": case.notes.split("\n")[-1] if case.notes else None,
            "next_action_date": case.next_action_at,
            "amount_owed": inv.amount,
            "currency": inv.currency,
        })
    return results


def get_case_for_invoice(db: Session, invoice_id: int, org_id: int) -> dict:
    """Get the collection case detail for a given invoice."""
    _get_invoice_or_404(db, invoice_id, org_id)

    row = (
        db.query(CollectionCase, Invoice, Client.full_name_or_company)
        .join(Invoice, Invoice.id == CollectionCase.invoice_id)
        .outerjoin(Client, Client.id == Invoice.client_id)
        .filter(
            CollectionCase.invoice_id == invoice_id,
            CollectionCase.organization_id == org_id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No hay caso de cobranza para esta factura")

    case, inv, client_full_name = row

    return {
        "id": case.id,
        "invoice_id": case.invoice_id,
        "invoice_number": _invoice_number(inv.id),
        "client_name": client_full_name or "—",
        "status": case.status if isinstance(case.status, str) else case.status.value,
        "last_contact_at": case.last_contact_at,
        "next_action": case.notes.split("\n")[-1] if case.notes else None,
        "next_action_date": case.next_action_at,
        "amount_owed": inv.amount,
        "currency": inv.currency,
        "notes": case.notes,
        "suspended_at": case.suspended_at,
        "terminated_at": case.terminated_at,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


# ── Stats ──────────────────────────────────────────────────────────────────

def get_stats(db: Session, org_id: int) -> dict:
    total_invoices = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.organization_id == org_id)
        .scalar()
    ) or 0

    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(
            Invoice.organization_id == org_id,
            Invoice.status.in_([
                InvoiceStatusEnum.SCHEDULED.value,
                InvoiceStatusEnum.DUE.value,
                InvoiceStatusEnum.OVERDUE.value,
            ]),
        )
        .scalar()
    ) or 0

    total_overdue = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(
            Invoice.organization_id == org_id,
            Invoice.status == InvoiceStatusEnum.OVERDUE.value,
        )
        .scalar()
    ) or 0

    active_cases = (
        db.query(func.count(CollectionCase.id))
        .filter(
            CollectionCase.organization_id == org_id,
            CollectionCase.status.notin_([
                CollectionCaseStatusEnum.PAID.value,
                CollectionCaseStatusEnum.TERMINATED.value,
            ]),
        )
        .scalar()
    ) or 0

    return {
        "total_invoices": int(total_invoices),
        "total_outstanding": int(total_outstanding),
        "total_overdue": int(total_overdue),
        "active_cases": int(active_cases),
    }


# ── Timeline ──────────────────────────────────────────────────────────────

def get_invoice_timeline(db: Session, invoice_id: int, org_id: int) -> List[dict]:
    """Build a timeline from audit_logs + payments for a given invoice."""
    _get_invoice_or_404(db, invoice_id, org_id)

    events: List[dict] = []

    # 1. Audit log entries for this invoice
    audit_rows = (
        db.query(AuditLog, User.full_name)
        .outerjoin(User, User.id == AuditLog.actor_user_id)
        .filter(
            AuditLog.entity_type == "invoice",
            AuditLog.entity_id == invoice_id,
            AuditLog.organization_id == org_id,
        )
        .order_by(AuditLog.created_at.asc())
        .all()
    )
    for log, actor_name in audit_rows:
        before = log.before_json or {}
        after = log.after_json or {}
        desc = f"{log.action}"
        if "status" in before and "status" in after:
            desc = f"Estado cambiado de '{before['status']}' a '{after['status']}'"
        events.append({
            "id": log.id,
            "event_type": "status_change",
            "description": desc,
            "actor": actor_name,
            "created_at": log.created_at,
        })

    # 2. Payment entries for this invoice
    payments = (
        db.query(Payment)
        .filter(Payment.invoice_id == invoice_id)
        .order_by(Payment.created_at.asc())
        .all()
    )
    for p in payments:
        events.append({
            "id": p.id + 1_000_000,  # offset to avoid id collision with audit logs
            "event_type": "payment",
            "description": f"Pago registrado: ${p.amount:,}",
            "actor": None,
            "created_at": p.created_at,
        })

    # 3. Collection case entries related to this invoice
    case_audit_rows = (
        db.query(AuditLog, User.full_name)
        .outerjoin(User, User.id == AuditLog.actor_user_id)
        .filter(
            AuditLog.entity_type == "collection_case",
            AuditLog.organization_id == org_id,
        )
        .all()
    )
    # Filter to only those whose entity_id refers to a collection case for this invoice
    case_ids = (
        db.query(CollectionCase.id)
        .filter(CollectionCase.invoice_id == invoice_id, CollectionCase.organization_id == org_id)
        .all()
    )
    case_id_set = {c[0] for c in case_ids}
    for log, actor_name in case_audit_rows:
        if log.entity_id in case_id_set:
            events.append({
                "id": log.id + 2_000_000,
                "event_type": "collection",
                "description": f"Cobranza: {log.action}",
                "actor": actor_name,
                "created_at": log.created_at,
            })

    # Sort all events by created_at
    events.sort(key=lambda e: e["created_at"])
    return events
