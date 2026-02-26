"""Document tools — document management, templates, PDF generation."""

import logging

from sqlalchemy.orm import Session
from jinja2.sandbox import SandboxedEnvironment, SecurityError

from app.core.agent_tools import ToolDefinition
from app.db.models import Document, Template
from app.db.enums import DocumentTypeEnum, DocumentStatusEnum, TemplateTypeEnum

logger = logging.getLogger(__name__)
_sandbox_env = SandboxedEnvironment(autoescape=True)


def list_documents(db: Session, params: dict, org_id: int) -> dict:
    """List documents with optional filters."""
    q = db.query(Document).filter(Document.organization_id == org_id)
    if params.get("entity_type"):
        q = q.filter(Document.entity_type == params["entity_type"])
    if params.get("entity_id"):
        q = q.filter(Document.entity_id == params["entity_id"])
    if params.get("doc_type"):
        q = q.filter(Document.doc_type == params["doc_type"])
    docs = q.order_by(Document.created_at.desc()).limit(params.get("limit", 10)).all()
    return {
        "count": len(docs),
        "documents": [
            {
                "id": d.id,
                "file_name": d.file_name,
                "doc_type": d.doc_type,
                "status": d.status,
                "version": d.version_int,
                "entity_type": d.entity_type,
                "entity_id": d.entity_id,
                "created_at": str(d.created_at),
            }
            for d in docs
        ],
    }


def get_template(db: Session, params: dict, org_id: int) -> dict:
    """Get a specific template by ID or type."""
    q = db.query(Template).filter(
        Template.organization_id == org_id,
        Template.active.is_(True),
    )
    if params.get("template_id"):
        q = q.filter(Template.id == params["template_id"])
    elif params.get("template_type"):
        q = q.filter(Template.template_type == params["template_type"])

    template = q.first()
    if not template:
        return {"error": "Plantilla no encontrada"}
    return {
        "id": template.id,
        "name": template.name,
        "type": template.template_type,
        "content": template.content_text,
        "variables": template.variables_json or [],
    }


def list_templates(db: Session, params: dict, org_id: int) -> dict:
    """List available templates."""
    templates = db.query(Template).filter(
        Template.organization_id == org_id,
        Template.active.is_(True),
    ).all()
    return {
        "count": len(templates),
        "templates": [
            {"id": t.id, "name": t.name, "type": t.template_type}
            for t in templates
        ],
    }


def render_template(db: Session, params: dict, org_id: int) -> dict:
    """Render a template with variable substitution."""
    template = db.query(Template).filter(
        Template.id == params["template_id"],
        Template.organization_id == org_id,
    ).first()
    if not template:
        return {"error": "Plantilla no encontrada"}

    content = template.content_text
    variables = params.get("variables", {})
    try:
        jinja_tmpl = _sandbox_env.from_string(content)
        rendered = jinja_tmpl.render(**{str(k): str(v) for k, v in variables.items()})
    except SecurityError as e:
        return {"error": f"Operación no permitida en plantilla: {e}"}
    except Exception as e:
        logger.warning("Template render failed: %s", e)
        rendered = content
        for key, value in variables.items():
            rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return {
        "rendered_content": rendered,
        "template_name": template.name,
    }


def create_document_record(db: Session, params: dict, org_id: int) -> dict:
    """Create a document record in the system."""
    doc = Document(
        organization_id=org_id,
        entity_type=params.get("entity_type"),
        entity_id=params.get("entity_id"),
        doc_type=params.get("doc_type", DocumentTypeEnum.OTHER.value),
        file_name=params["file_name"],
        storage_path=params.get("storage_path", f"/storage/{params['file_name']}"),
        status=DocumentStatusEnum.DRAFT.value,
    )
    db.add(doc)
    db.flush()
    return {"document_id": doc.id, "status": "created"}


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="list_documents",
        description="Listar documentos del sistema con filtros por entidad y tipo.",
        input_schema={
            "type": "object",
            "properties": {
                "entity_type": {"type": "string", "description": "matter, client, lead, etc."},
                "entity_id": {"type": "integer"},
                "doc_type": {"type": "string", "description": "proposal_pdf, contract_pdf, etc."},
                "limit": {"type": "integer"},
            },
        },
        handler=list_documents,
        skill_key="gestion_documental",
    ),
    ToolDefinition(
        name="get_template",
        description="Obtener una plantilla específica por ID o tipo.",
        input_schema={
            "type": "object",
            "properties": {
                "template_id": {"type": "integer"},
                "template_type": {"type": "string", "description": "email, proposal, contract, mandate"},
            },
        },
        handler=get_template,
        skill_key="gestion_documental",
    ),
    ToolDefinition(
        name="list_templates",
        description="Listar todas las plantillas activas disponibles.",
        input_schema={
            "type": "object",
            "properties": {},
        },
        handler=list_templates,
        skill_key="gestion_documental",
    ),
    ToolDefinition(
        name="render_template",
        description="Renderizar una plantilla reemplazando variables con valores específicos.",
        input_schema={
            "type": "object",
            "properties": {
                "template_id": {"type": "integer", "description": "ID de la plantilla"},
                "variables": {"type": "object", "description": "Variables a reemplazar: {nombre: valor}"},
            },
            "required": ["template_id"],
        },
        handler=render_template,
        skill_key="gestion_documental",
    ),
    ToolDefinition(
        name="create_document_record",
        description="Crear un registro de documento en el sistema.",
        input_schema={
            "type": "object",
            "properties": {
                "file_name": {"type": "string", "description": "Nombre del archivo"},
                "doc_type": {"type": "string", "description": "Tipo de documento"},
                "entity_type": {"type": "string"},
                "entity_id": {"type": "integer"},
                "storage_path": {"type": "string"},
            },
            "required": ["file_name"],
        },
        handler=create_document_record,
        skill_key="gestion_documental",
    ),
]
