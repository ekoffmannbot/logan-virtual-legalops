"""Notarial tools — notary documents, status tracking, client contact tasks."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.agent_tools import ToolDefinition
from app.db.models import NotaryDocument, Client, Task
from app.db.enums import NotaryDocStatusEnum, TaskTypeEnum, TaskStatusEnum


def get_notary_documents(db: Session, params: dict, org_id: int) -> dict:
    """Get notary documents with optional filters."""
    q = db.query(NotaryDocument).filter(NotaryDocument.organization_id == org_id)
    if params.get("client_id"):
        q = q.filter(NotaryDocument.client_id == params["client_id"])
    if params.get("matter_id"):
        q = q.filter(NotaryDocument.matter_id == params["matter_id"])
    if params.get("status"):
        q = q.filter(NotaryDocument.status == params["status"])
    docs = q.order_by(NotaryDocument.created_at.desc()).limit(params.get("limit", 10)).all()
    return {
        "count": len(docs),
        "documents": [
            {
                "id": d.id,
                "client_id": d.client_id,
                "matter_id": d.matter_id,
                "doc_type": d.doc_type,
                "status": d.status,
                "notary_name": d.notary_name,
                "sent_at": str(d.sent_at) if d.sent_at else None,
                "notes": d.notes,
            }
            for d in docs
        ],
    }


def update_notary_status(db: Session, params: dict, org_id: int) -> dict:
    """Update the status of a notary document."""
    doc = db.query(NotaryDocument).filter(
        NotaryDocument.id == params["document_id"],
        NotaryDocument.organization_id == org_id,
    ).first()
    if not doc:
        return {"error": "Documento notarial no encontrado"}

    old_status = doc.status
    doc.status = params["new_status"]

    # Auto-set timestamps based on status
    now = datetime.now(timezone.utc)
    if params["new_status"] == NotaryDocStatusEnum.SENT_TO_NOTARY.value and not doc.sent_at:
        doc.sent_at = now
    elif params["new_status"] == NotaryDocStatusEnum.NOTARY_RECEIVED.value and not doc.received_at:
        doc.received_at = now
    elif params["new_status"] == NotaryDocStatusEnum.NOTARY_SIGNED.value and not doc.notary_signed_at:
        doc.notary_signed_at = now
    elif params["new_status"] == NotaryDocStatusEnum.CLIENT_SIGNED.value and not doc.client_signed_at:
        doc.client_signed_at = now
    elif params["new_status"] == NotaryDocStatusEnum.ARCHIVED.value and not doc.archived_at:
        doc.archived_at = now

    if params.get("notes"):
        doc.notes = (doc.notes or "") + f"\n[{now.isoformat()}] {params['notes']}"

    db.flush()
    return {
        "document_id": doc.id,
        "old_status": old_status,
        "new_status": doc.status,
    }


def create_notary_contact_task(db: Session, params: dict, org_id: int) -> dict:
    """Create a task to contact the client about a notary document."""
    doc = db.query(NotaryDocument).filter(
        NotaryDocument.id == params["document_id"],
        NotaryDocument.organization_id == org_id,
    ).first()
    if not doc:
        return {"error": "Documento notarial no encontrado"}

    client = db.query(Client).filter(Client.id == doc.client_id).first()

    task = Task(
        organization_id=org_id,
        title=params.get("title", f"Contactar cliente por documento notarial #{doc.id}"),
        description=params.get("description", f"Cliente: {client.full_name_or_company if client else 'N/A'}\nDocumento: {doc.doc_type}\nEstado: {doc.status}"),
        entity_type="notary_document",
        entity_id=doc.id,
        task_type=TaskTypeEnum.NOTARY_CONTACT.value,
        status=TaskStatusEnum.OPEN.value,
        assigned_role=params.get("assigned_role", "secretaria"),
    )
    db.add(task)
    db.flush()
    return {"task_id": task.id, "status": "created", "assigned_role": task.assigned_role}


def get_pending_notary_actions(db: Session, params: dict, org_id: int) -> dict:
    """Get notary documents that need action (not in terminal states)."""
    terminal = {
        NotaryDocStatusEnum.ARCHIVED.value,
        NotaryDocStatusEnum.REPORTED_TO_MANAGER.value,
    }
    docs = db.query(NotaryDocument).filter(
        NotaryDocument.organization_id == org_id,
        ~NotaryDocument.status.in_(terminal),
    ).order_by(NotaryDocument.created_at).all()

    return {
        "count": len(docs),
        "pending": [
            {
                "id": d.id,
                "client_id": d.client_id,
                "doc_type": d.doc_type,
                "status": d.status,
                "notary_name": d.notary_name,
                "days_in_status": (datetime.now(timezone.utc) - d.updated_at).days if d.updated_at else None,
            }
            for d in docs
        ],
    }


# ── Tool Definitions ──────────────────────────────────────────────────────────

TOOLS: list[ToolDefinition] = [
    ToolDefinition(
        name="get_notary_documents",
        description="Obtener documentos notariales con filtros por cliente, causa o estado.",
        input_schema={
            "type": "object",
            "properties": {
                "client_id": {"type": "integer"},
                "matter_id": {"type": "integer"},
                "status": {"type": "string", "description": "antecedents_requested, sent_to_notary, notary_signed, etc."},
                "limit": {"type": "integer"},
            },
        },
        handler=get_notary_documents,
        skill_key="tramites_notariales",
    ),
    ToolDefinition(
        name="update_notary_status",
        description="Actualizar el estado de un documento notarial con timestamps automáticos.",
        input_schema={
            "type": "object",
            "properties": {
                "document_id": {"type": "integer", "description": "ID del documento notarial"},
                "new_status": {"type": "string", "description": "Nuevo estado del documento"},
                "notes": {"type": "string", "description": "Notas adicionales"},
            },
            "required": ["document_id", "new_status"],
        },
        handler=update_notary_status,
        skill_key="tramites_notariales",
    ),
    ToolDefinition(
        name="create_notary_contact_task",
        description="Crear tarea para contactar al cliente sobre un documento notarial.",
        input_schema={
            "type": "object",
            "properties": {
                "document_id": {"type": "integer", "description": "ID del documento notarial"},
                "title": {"type": "string"},
                "description": {"type": "string"},
                "assigned_role": {"type": "string", "description": "Rol asignado (default: secretaria)"},
            },
            "required": ["document_id"],
        },
        handler=create_notary_contact_task,
        skill_key="tramites_notariales",
    ),
    ToolDefinition(
        name="get_pending_notary_actions",
        description="Obtener documentos notariales que requieren acción (no archivados).",
        input_schema={
            "type": "object",
            "properties": {},
        },
        handler=get_pending_notary_actions,
        skill_key="tramites_notariales",
    ),
]
