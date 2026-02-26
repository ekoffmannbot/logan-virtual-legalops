"""Periodic health check by Admin TI agent."""

import logging

from app.tasks.celery_app import celery_app
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

AGENT_ROLE = "agente_comercial"  # Admin TI uses this role


@celery_app.task(name="app.tasks.agent_health_tasks.agent_health_check")
def agent_health_check():
    """Run periodic system health check via Admin TI agent."""
    db = SessionLocal()
    try:
        from app.core.agent_dispatch import agent_draft, get_agent_id
        from app.db.models import AIAgent
        from sqlalchemy import func

        # Get all orgs with active agents
        org_ids = db.query(AIAgent.organization_id).filter(
            AIAgent.is_active.is_(True),
        ).distinct().all()

        results = []
        for (org_id,) in org_ids:
            health_report = agent_draft(
                db, org_id, AGENT_ROLE,
                "Ejecuta un chequeo de salud del sistema. Revisa el estado general "
                "de las causas, facturas, tickets de email y tareas pendientes. "
                "Reporta cualquier anomalía o item que requiera atención inmediata. "
                "Formato: lista de items con estado (OK/ATENCIÓN/CRÍTICO).",
                "Health check completado sin anomalías detectadas.",
                task_type="health_check",
            )
            results.append({"org_id": org_id, "report": health_report[:200]})

        db.commit()
        return {"checks_run": len(results), "results": results}
    except Exception as exc:
        logger.exception("Agent health check failed")
        return {"error": str(exc)}
    finally:
        db.close()
