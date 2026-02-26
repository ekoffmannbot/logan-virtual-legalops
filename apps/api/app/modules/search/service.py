"""
Global search service using PostgreSQL full-text search.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone

from sqlalchemy import or_, func, cast, String, text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _sanitize_query(q: str) -> str:
    """Sanitize search query for PostgreSQL tsquery."""
    # Remove special characters that break tsquery
    q = re.sub(r"[^\w\s\-.]", "", q)
    # Split into terms and join with &
    terms = q.strip().split()
    if not terms:
        return ""
    return " & ".join(f"{t}:*" for t in terms[:10])  # Prefix matching, max 10 terms


def _search_model(db: Session, model, org_id: int, fields: list[str], ts_query: str, limit: int) -> list[dict]:
    """Search a single model using ILIKE (works without tsvector indexes)."""
    results = []

    if not ts_query:
        return results

    # Use ILIKE for robust search (works without special indexes)
    original_terms = ts_query.replace(":*", "").replace(" & ", " ").split()

    conditions = []
    for term in original_terms:
        term_conditions = []
        for field_name in fields:
            field = getattr(model, field_name, None)
            if field is not None:
                term_conditions.append(cast(field, String).ilike(f"%{term}%"))
        if term_conditions:
            conditions.append(or_(*term_conditions))

    if not conditions:
        return results

    from sqlalchemy import and_
    query = db.query(model).filter(
        model.organization_id == org_id,
        and_(*conditions),
    ).limit(limit)

    for row in query.all():
        result = {
            "id": row.id,
            "type": model.__tablename__,
            "title": "",
            "subtitle": "",
        }
        # Build display title from first available field
        for f in fields:
            val = getattr(row, f, None)
            if val:
                if not result["title"]:
                    result["title"] = str(val)
                elif not result["subtitle"]:
                    result["subtitle"] = str(val)
        results.append(result)

    return results


def global_search(db: Session, org_id: int, q: str, search_type: str, limit: int) -> dict:
    """Execute global search across multiple entity types."""
    ts_query = _sanitize_query(q)
    results = []
    per_type_limit = limit if search_type != "all" else max(5, limit // 5)

    search_configs = {
        "clients": ("app.db.models.client", "Client", ["name", "rut", "email", "phone"]),
        "matters": ("app.db.models.matter", "Matter", ["title", "rol", "description"]),
        "leads": ("app.db.models.lead", "Lead", ["name", "email", "phone", "company"]),
        "contracts": ("app.db.models.contract", "Contract", ["title", "description"]),
        "documents": ("app.db.models.document", "Document", ["original_name", "description"]),
    }

    types_to_search = [search_type] if search_type != "all" else list(search_configs.keys())

    for stype in types_to_search:
        config = search_configs.get(stype)
        if not config:
            continue
        module_path, class_name, fields = config
        try:
            import importlib
            mod = importlib.import_module(module_path)
            model_class = getattr(mod, class_name)
            type_results = _search_model(db, model_class, org_id, fields, ts_query, per_type_limit)
            results.extend(type_results)
        except Exception as exc:
            logger.warning("Search failed for %s: %s", stype, exc)

    return {
        "query": q,
        "type": search_type,
        "total": len(results),
        "results": results[:limit],
        "searched_at": datetime.now(timezone.utc).isoformat(),
    }
