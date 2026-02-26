"""Financial tools — invoices, collections, payments, financial reports."""

from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.agent_tools import ToolDefinition
from app.db.models import Invoice, Payment, CollectionCase, Client, Communication
from app.db.enums import InvoiceStatusEnum, CollectionCaseStatusEnum, CommunicationChannelEnum, CommunicationDirectionEnum


def get_overdue_invoices(db: Session, params: dict, org_id: int) -> dict:
    """Get all overdue invoices with client details."""
    q = db.query(Invoice).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatusEnum.OVERDUE.value,
    )
    if params.get("client_id"):
        q = q.filter(Invoice.client_id == params["client_id"])
    invoices = q.order_by(Invoice.due_date).limit(params.get("limit", 20)).all()
    results = []
    for inv in invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        results.append({
            "id": inv.id,
            "client": client.full_name_or_company if client else "Desconocido",
            "client_id": inv.client_id,
            "amount": inv.amount,
            "currency": inv.currency,
            "due_date": str(inv.due_date),
            "days_overdue": (datetime.now(timezone.utc).date() - inv.due_date).days
            if hasattr(inv.due_date, "day") else 0,
        })
    return {"count": len(results), "invoices": results}


def get_invoice_details(db: Session, params: dict, org_id: int) -> dict:
    """Get detailed information about a specific invoice."""
    inv = db.query(Invoice).filter(
        Invoice.id == params["invoice_id"],
        Invoice.organization_id == org_id,
    ).first()
    if not inv:
        return {"error": "Factura no encontrada"}
    client = db.query(Client).filter(Client.id == inv.client_id).first()
    payments = db.query(Payment).filter(Payment.invoice_id == inv.id).all()
    total_paid = sum(p.amount for p in payments)
    return {
        "id": inv.id,
        "client": client.full_name_or_company if client else None,
        "amount": inv.amount,
        "currency": inv.currency,
        "due_date": str(inv.due_date),
        "status": inv.status,
        "total_paid": total_paid,
        "balance": inv.amount - total_paid,
        "payments": [
            {"id": p.id, "amount": p.amount, "paid_at": str(p.paid_at)}
            for p in payments
        ],
    }


def create_collection_reminder(db: Session, params: dict, org_id: int) -> dict:
    """Create a collection case reminder for an overdue invoice."""
    inv = db.query(Invoice).filter(
        Invoice.id == params["invoice_id"],
        Invoice.organization_id == org_id,
    ).first()
    if not inv:
        return {"error": "Factura no encontrada"}

    # Check for existing collection case
    existing = db.query(CollectionCase).filter(
        CollectionCase.invoice_id == inv.id,
    ).first()
    if existing:
        existing.notes = (existing.notes or "") + f"\n[{datetime.now(timezone.utc).isoformat()}] {params.get('note', 'Recordatorio generado por agente')}"
        existing.next_action_at = datetime.now(timezone.utc)
        db.flush()
        return {"collection_case_id": existing.id, "status": existing.status, "action": "updated"}

    case = CollectionCase(
        organization_id=org_id,
        invoice_id=inv.id,
        status=CollectionCaseStatusEnum.PRE_DUE_CONTACT.value,
        notes=params.get("note", "Caso de cobranza creado por agente"),
        next_action_at=datetime.now(timezone.utc),
    )
    db.add(case)
    db.flush()
    return {"collection_case_id": case.id, "status": "created"}


def generate_financial_report(db: Session, params: dict, org_id: int) -> dict:
    """Generate a financial summary report."""
    total_invoiced = db.query(func.sum(Invoice.amount)).filter(
        Invoice.organization_id == org_id,
    ).scalar() or 0

    total_paid = db.query(func.sum(Payment.amount)).filter(
        Payment.organization_id == org_id,
    ).scalar() or 0

    overdue_count = db.query(func.count(Invoice.id)).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatusEnum.OVERDUE.value,
    ).scalar() or 0

    overdue_amount = db.query(func.sum(Invoice.amount)).filter(
        Invoice.organization_id == org_id,
        Invoice.status == InvoiceStatusEnum.OVERDUE.value,
    ).scalar() or 0

    by_status = db.query(
        Invoice.status, func.count(Invoice.id), func.sum(Invoice.amount)
    ).filter(
        Invoice.organization_id == org_id,
    ).group_by(Invoice.status).all()

    return {
        "total_invoiced_clp": total_invoiced,
        "total_paid_clp": total_paid,
        "collection_rate": round(total_paid / total_invoiced * 100, 1) if total_invoiced else 0,
        "overdue_count": overdue_count,
        "overdue_amount_clp": overdue_amount,
        "by_status": [
            {"status": s, "count": c, "amount": a or 0} for s, c, a in by_status
        ],
    }


def get_client_balance(db: Session, params: dict, org_id: int) -> dict:
    """Get the financial balance for a specific client."""
    client = db.query(Client).filter(
        Client.id == params["client_id"],
        Client.organization_id == org_id,
    ).first()
    if not client:
        return {"error": "Cliente no encontrado"}

    invoices = db.query(Invoice).filter(
        Invoice.client_id == client.id,
    ).all()

    total_invoiced = sum(i.amount for i in invoices)
    total_paid = 0
    for inv in invoices:
        payments = db.query(Payment).filter(Payment.invoice_id == inv.id).all()
        total_paid += sum(p.amount for p in payments)

    return {
        "client": client.full_name_or_company,
        "total_invoiced": total_invoiced,
        "total_paid": total_paid,
        "balance": total_invoiced - total_paid,
        "invoice_count": len(invoices),
        "overdue_count": sum(1 for i in invoices if i.status == InvoiceStatusEnum.OVERDUE.value),
    }


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="get_overdue_invoices",
        description="Obtener listado de facturas vencidas con detalles del cliente y días de atraso.",
        input_schema={
            "type": "object",
            "properties": {
                "client_id": {"type": "integer", "description": "Filtrar por ID de cliente"},
                "limit": {"type": "integer", "description": "Máximo resultados (default 20)"},
            },
        },
        handler=get_overdue_invoices,
        skill_key="cobranza",
    ),
    ToolDefinition(
        name="get_invoice_details",
        description="Obtener detalles de una factura específica incluyendo pagos realizados.",
        input_schema={
            "type": "object",
            "properties": {
                "invoice_id": {"type": "integer", "description": "ID de la factura"},
            },
            "required": ["invoice_id"],
        },
        handler=get_invoice_details,
        skill_key="facturacion",
    ),
    ToolDefinition(
        name="create_collection_reminder",
        description="Crear o actualizar un caso de cobranza para una factura vencida.",
        input_schema={
            "type": "object",
            "properties": {
                "invoice_id": {"type": "integer", "description": "ID de la factura"},
                "note": {"type": "string", "description": "Nota adicional para el recordatorio"},
            },
            "required": ["invoice_id"],
        },
        handler=create_collection_reminder,
        skill_key="cobranza",
    ),
    ToolDefinition(
        name="generate_financial_report",
        description="Generar reporte financiero resumido con facturación, cobros y morosidad.",
        input_schema={
            "type": "object",
            "properties": {},
        },
        handler=generate_financial_report,
        skill_key="reportes_financieros",
    ),
    ToolDefinition(
        name="get_client_balance",
        description="Obtener balance financiero de un cliente específico.",
        input_schema={
            "type": "object",
            "properties": {
                "client_id": {"type": "integer", "description": "ID del cliente"},
            },
            "required": ["client_id"],
        },
        handler=get_client_balance,
        skill_key="analisis_rentabilidad",
    ),
]
