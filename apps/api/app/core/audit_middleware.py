"""
Comprehensive audit logging middleware for Logan Virtual.

Records ALL write operations (POST, PUT, PATCH, DELETE) with:
- Who (user ID, role)
- What (action, entity type, entity ID)
- When (timestamp)
- From where (IP, user agent)
- Before/after state (for updates)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def create_audit_log(
    db: Session,
    actor_user_id: int,
    organization_id: int,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    before_json: dict | None = None,
    after_json: dict | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
):
    """
    Create an audit log entry.

    Args:
        db: Database session
        actor_user_id: User performing the action
        organization_id: Organization scope
        action: Action performed (create, update, delete, transition, login, etc.)
        entity_type: Type of entity (lead, client, matter, etc.)
        entity_id: ID of the entity
        before_json: State before the change (for updates)
        after_json: State after the change
        ip: Client IP address
        user_agent: Client user agent string
    """
    from app.db.models.audit_log import AuditLog

    try:
        log_entry = AuditLog(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_json=before_json,
            after_json=after_json,
            ip=ip,
            user_agent=user_agent,
        )
        db.add(log_entry)
        # Don't commit here — let the caller's transaction handle it
        db.flush()
    except Exception as exc:
        logger.error("Failed to create audit log: %s", exc)


def get_audit_trail(
    db: Session,
    organization_id: int,
    entity_type: str | None = None,
    entity_id: int | None = None,
    actor_user_id: int | None = None,
    action: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[dict]:
    """
    Query audit trail with optional filters.
    """
    from app.db.models.audit_log import AuditLog
    from app.db.models.user import User

    q = db.query(AuditLog).filter(AuditLog.organization_id == organization_id)

    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if actor_user_id:
        q = q.filter(AuditLog.actor_user_id == actor_user_id)
    if action:
        q = q.filter(AuditLog.action == action)

    logs = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()

    results = []
    for log in logs:
        # Get actor name
        actor = db.query(User.full_name).filter(User.id == log.actor_user_id).scalar()

        results.append({
            "id": log.id,
            "actor_user_id": log.actor_user_id,
            "actor_name": actor or "Sistema",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "before": log.before_json,
            "after": log.after_json,
            "ip": log.ip,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    return results
