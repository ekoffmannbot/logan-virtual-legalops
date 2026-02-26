"""
Global search endpoint using PostgreSQL Full-Text Search.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.search import service

router = APIRouter()


@router.get("/")
def global_search(
    q: str = Query(..., min_length=2, max_length=200),
    type: str = Query("all", pattern="^(all|clients|matters|leads|contracts|documents)$"),
    limit: int = Query(20, ge=1, le=100),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Global search across clients, matters, leads, contracts, and documents.
    Uses PostgreSQL full-text search with tsquery.
    """
    return service.global_search(db, user.organization_id, q, type, limit)
