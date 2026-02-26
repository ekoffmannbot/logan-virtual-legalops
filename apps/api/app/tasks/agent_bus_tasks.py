"""Celery tasks for async inter-agent message delivery."""

import logging
from typing import Optional

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)


@celery_app.task(name="deliver_agent_message", bind=True, max_retries=2)
def deliver_agent_message(
    self,
    from_agent_id: int,
    to_agent_role: str,
    org_id: int,
    message: str,
    context: Optional[dict] = None,
    thread_id: Optional[str] = None,
):
    """Deliver an inter-agent message asynchronously via Celery."""
    db = SessionLocal()
    try:
        from app.core.agent_bus import AgentBus
        bus = AgentBus(db, org_id)
        result = bus.send_message(
            from_agent_id=from_agent_id,
            to_agent_role=to_agent_role,
            message=message,
            context=context,
            thread_id=thread_id,
        )
        db.commit()
        logger.info(
            "Agent message delivered: from=%s to=%s status=%s",
            from_agent_id, to_agent_role, result.get("status"),
        )
        return result
    except Exception as exc:
        db.rollback()
        logger.exception("Failed to deliver agent message")
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
