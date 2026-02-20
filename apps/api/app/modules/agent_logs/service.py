from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.models.audit_log import AuditLog


# Map action prefixes to agent names
AGENT_MAP = {
    "auto:proposal_followup": "Secretaria",
    "auto:email_sla": "Abogado",
    "auto:collection_reminder": "Jefe Cobranza",
    "auto:notary_contact": "Procurador",
    "auto:case_review": "Revisor de Causas",
    "auto:scraper": "Comercial",
    "auto:": "Sistema",  # fallback for any auto: action
}


def _resolve_agent_name(action: str) -> str:
    """Map an action string to a human-readable agent name."""
    for prefix, name in AGENT_MAP.items():
        if action.startswith(prefix):
            return name
    return "Sistema"


def _resolve_status(after_json: dict) -> tuple:
    """Determine status and actionRequired from the audit log entry."""
    status = after_json.get("status", "completed") if after_json else "completed"
    action_required = after_json.get("action_required", False) if after_json else False
    return status, action_required


def get_agent_logs(db: Session, org_id: int, limit: int = 50) -> list:
    """Get agent activity logs from AuditLog entries."""
    logs = (
        db.query(AuditLog)
        .filter(
            AuditLog.organization_id == org_id,
            or_(
                AuditLog.actor_user_id.is_(None),
                AuditLog.action.like("auto:%"),
            ),
        )
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )

    result = []
    for log in logs:
        after = log.after_json or {}
        status, action_required = _resolve_status(after)

        result.append({
            "id": f"al-{log.id}",
            "agentName": after.get("agent", _resolve_agent_name(log.action)),
            "action": after.get("detail", log.action),
            "detail": after.get("detail_long", after.get("detail", None)),
            "timestamp": log.created_at,
            "status": status,
            "entityType": log.entity_type,
            "entityId": str(log.entity_id) if log.entity_id else None,
            "actionRequired": action_required,
        })

    return result
