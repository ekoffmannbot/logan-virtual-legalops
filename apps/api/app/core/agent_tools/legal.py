"""Legal tools — matter management, case analysis, proposals, contracts."""

from sqlalchemy.orm import Session

from app.core.agent_tools import ToolDefinition
from app.db.models import Matter, Lead, Proposal, Client, Contract, Deadline
from app.db.enums import MatterStatusEnum, ProposalStatusEnum


def get_matter_details(db: Session, params: dict, org_id: int) -> dict:
    """Get detailed information about a specific legal matter."""
    matter = db.query(Matter).filter(
        Matter.id == params["matter_id"],
        Matter.organization_id == org_id,
    ).first()
    if not matter:
        return {"error": "Causa no encontrada"}
    client = db.query(Client).filter(Client.id == matter.client_id).first()
    deadlines = db.query(Deadline).filter(
        Deadline.matter_id == matter.id,
        Deadline.status == "open",
    ).order_by(Deadline.due_at).limit(5).all()
    return {
        "id": matter.id,
        "title": matter.title,
        "type": matter.matter_type,
        "status": matter.status,
        "court": matter.court_name,
        "rol": matter.rol_number,
        "description": matter.description,
        "client": client.full_name_or_company if client else None,
        "client_rut": client.rut if client else None,
        "upcoming_deadlines": [
            {"id": d.id, "title": d.title, "due_at": str(d.due_at), "severity": d.severity}
            for d in deadlines
        ],
    }


def search_matters(db: Session, params: dict, org_id: int) -> dict:
    """Search matters by keyword, status, or client."""
    q = db.query(Matter).filter(Matter.organization_id == org_id)
    if params.get("status"):
        q = q.filter(Matter.status == params["status"])
    if params.get("keyword"):
        kw = f"%{params['keyword']}%"
        q = q.filter(Matter.title.ilike(kw) | Matter.description.ilike(kw))
    if params.get("client_id"):
        q = q.filter(Matter.client_id == params["client_id"])
    matters = q.order_by(Matter.updated_at.desc()).limit(params.get("limit", 10)).all()
    return {
        "count": len(matters),
        "matters": [
            {"id": m.id, "title": m.title, "status": m.status, "type": m.matter_type}
            for m in matters
        ],
    }


def create_proposal_draft(db: Session, params: dict, org_id: int) -> dict:
    """Create a draft proposal for a lead or client."""
    proposal = Proposal(
        organization_id=org_id,
        lead_id=params.get("lead_id"),
        client_id=params.get("client_id"),
        matter_id=params.get("matter_id"),
        status=ProposalStatusEnum.DRAFT.value,
        amount=params.get("amount"),
        payment_terms_text=params.get("payment_terms"),
        strategy_summary_text=params.get("strategy_summary"),
    )
    db.add(proposal)
    db.flush()
    return {"proposal_id": proposal.id, "status": "draft", "message": "Borrador de propuesta creado"}


def analyze_case_law(db: Session, params: dict, org_id: int) -> dict:
    """Retrieve matter context for legal analysis."""
    matter = db.query(Matter).filter(
        Matter.id == params["matter_id"],
        Matter.organization_id == org_id,
    ).first()
    if not matter:
        return {"error": "Causa no encontrada"}
    client = db.query(Client).filter(Client.id == matter.client_id).first()
    return {
        "matter_title": matter.title,
        "matter_type": matter.matter_type,
        "description": matter.description or "",
        "court": matter.court_name or "",
        "rol": matter.rol_number or "",
        "client_name": client.full_name_or_company if client else "",
        "status": matter.status,
        "note": "Use this context to provide legal analysis based on Chilean law",
    }


def get_leads(db: Session, params: dict, org_id: int) -> dict:
    """Get leads with optional status filter."""
    q = db.query(Lead).filter(Lead.organization_id == org_id)
    if params.get("status"):
        q = q.filter(Lead.status == params["status"])
    leads = q.order_by(Lead.created_at.desc()).limit(params.get("limit", 10)).all()
    return {
        "count": len(leads),
        "leads": [
            {"id": l.id, "name": l.full_name, "status": l.status, "email": l.email, "phone": l.phone}
            for l in leads
        ],
    }


def get_contracts(db: Session, params: dict, org_id: int) -> dict:
    """Get contracts with optional status filter."""
    q = db.query(Contract).filter(Contract.organization_id == org_id)
    if params.get("status"):
        q = q.filter(Contract.status == params["status"])
    if params.get("matter_id"):
        q = q.filter(Contract.matter_id == params["matter_id"])
    contracts = q.order_by(Contract.updated_at.desc()).limit(10).all()
    return {
        "count": len(contracts),
        "contracts": [
            {"id": c.id, "status": c.status, "matter_id": c.matter_id}
            for c in contracts
        ],
    }


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="get_matter_details",
        description="Obtener detalles completos de una causa legal incluyendo cliente y plazos pendientes.",
        input_schema={
            "type": "object",
            "properties": {
                "matter_id": {"type": "integer", "description": "ID de la causa"}
            },
            "required": ["matter_id"],
        },
        handler=get_matter_details,
        skill_key="analisis_casos",
    ),
    ToolDefinition(
        name="search_matters",
        description="Buscar causas por palabra clave, estado o cliente.",
        input_schema={
            "type": "object",
            "properties": {
                "keyword": {"type": "string", "description": "Texto a buscar en título/descripción"},
                "status": {"type": "string", "description": "Estado: open, closed, suspended_nonpayment, terminated"},
                "client_id": {"type": "integer", "description": "ID del cliente"},
                "limit": {"type": "integer", "description": "Máximo resultados (default 10)"},
            },
        },
        handler=search_matters,
        skill_key="analisis_casos",
    ),
    ToolDefinition(
        name="create_proposal_draft",
        description="Crear un borrador de propuesta de servicios jurídicos.",
        input_schema={
            "type": "object",
            "properties": {
                "lead_id": {"type": "integer", "description": "ID del lead"},
                "client_id": {"type": "integer", "description": "ID del cliente"},
                "matter_id": {"type": "integer", "description": "ID de la causa"},
                "amount": {"type": "integer", "description": "Monto en CLP"},
                "payment_terms": {"type": "string", "description": "Términos de pago"},
                "strategy_summary": {"type": "string", "description": "Resumen de estrategia legal"},
            },
        },
        handler=create_proposal_draft,
        requires_approval=False,
        skill_key="redaccion_legal",
    ),
    ToolDefinition(
        name="analyze_case_law",
        description="Obtener contexto de una causa para análisis jurídico basado en ley chilena.",
        input_schema={
            "type": "object",
            "properties": {
                "matter_id": {"type": "integer", "description": "ID de la causa a analizar"},
            },
            "required": ["matter_id"],
        },
        handler=analyze_case_law,
        skill_key="jurisprudencia",
    ),
    ToolDefinition(
        name="get_leads",
        description="Obtener listado de leads/prospectos con filtro opcional por estado.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "new, contacted, meeting_scheduled, proposal_sent, won, lost"},
                "limit": {"type": "integer", "description": "Máximo resultados"},
            },
        },
        handler=get_leads,
        skill_key="investigacion_legal",
    ),
    ToolDefinition(
        name="get_contracts",
        description="Obtener listado de contratos con filtro por estado o causa.",
        input_schema={
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "Estado del contrato"},
                "matter_id": {"type": "integer", "description": "ID de la causa"},
            },
        },
        handler=get_contracts,
        skill_key="revision_contratos",
    ),
]
