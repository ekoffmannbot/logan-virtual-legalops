"""
Time tracking service for Logan Virtual.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def _get_or_create_model(db: Session):
    """Get TimeEntry model, creating table if needed via raw SQL fallback."""
    from app.db.models.time_entry import TimeEntry
    return TimeEntry


def list_entries(
    db: Session, org_id: int,
    matter_id: int | None = None,
    user_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list:
    TimeEntry = _get_or_create_model(db)
    q = db.query(TimeEntry).filter(TimeEntry.organization_id == org_id)
    if matter_id:
        q = q.filter(TimeEntry.matter_id == matter_id)
    if user_id:
        q = q.filter(TimeEntry.user_id == user_id)
    if start_date:
        q = q.filter(TimeEntry.entry_date >= start_date)
    if end_date:
        q = q.filter(TimeEntry.entry_date <= end_date)
    entries = q.order_by(TimeEntry.entry_date.desc()).all()

    return [
        {
            "id": e.id,
            "matter_id": e.matter_id,
            "user_id": e.user_id,
            "description": e.description,
            "hours": float(e.hours),
            "rate_per_hour": float(e.rate_per_hour) if e.rate_per_hour else 0,
            "total": float(e.hours) * (float(e.rate_per_hour) if e.rate_per_hour else 0),
            "billable": e.billable,
            "entry_date": str(e.entry_date),
        }
        for e in entries
    ]


def get_summary(
    db: Session, org_id: int,
    start_date: date | None, end_date: date | None,
    group_by: str,
) -> dict:
    TimeEntry = _get_or_create_model(db)
    q = db.query(TimeEntry).filter(
        TimeEntry.organization_id == org_id,
        TimeEntry.deleted_at.is_(None),
    )
    if start_date:
        q = q.filter(TimeEntry.entry_date >= start_date)
    if end_date:
        q = q.filter(TimeEntry.entry_date <= end_date)

    entries = q.all()
    groups: dict = {}

    for e in entries:
        if group_by == "user":
            key = str(e.user_id)
        elif group_by == "matter":
            key = str(e.matter_id)
        else:
            key = str(e.matter_id)  # Will map to client via matter later

        if key not in groups:
            groups[key] = {"total_hours": 0, "billable_hours": 0, "total_amount": 0, "entries": 0}

        groups[key]["total_hours"] += float(e.hours)
        groups[key]["entries"] += 1
        if e.billable:
            groups[key]["billable_hours"] += float(e.hours)
            groups[key]["total_amount"] += float(e.hours) * (float(e.rate_per_hour) if e.rate_per_hour else 0)

    return {
        "group_by": group_by,
        "period": {"start": str(start_date) if start_date else None, "end": str(end_date) if end_date else None},
        "groups": groups,
        "totals": {
            "hours": sum(g["total_hours"] for g in groups.values()),
            "billable_hours": sum(g["billable_hours"] for g in groups.values()),
            "amount": sum(g["total_amount"] for g in groups.values()),
        },
    }


def create_entry(db: Session, user, data: dict) -> dict:
    TimeEntry = _get_or_create_model(db)
    entry = TimeEntry(
        organization_id=user.organization_id,
        user_id=user.id,
        **data,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {
        "id": entry.id,
        "matter_id": entry.matter_id,
        "user_id": entry.user_id,
        "description": entry.description,
        "hours": float(entry.hours),
        "rate_per_hour": float(entry.rate_per_hour) if entry.rate_per_hour else 0,
        "billable": entry.billable,
        "entry_date": str(entry.entry_date),
    }


def update_entry(db: Session, user, entry_id: int, data: dict) -> dict:
    TimeEntry = _get_or_create_model(db)
    entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_id,
        TimeEntry.organization_id == user.organization_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Registro de tiempo no encontrado")
    for k, v in data.items():
        setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return {"id": entry.id, "status": "updated"}


def delete_entry(db: Session, user, entry_id: int) -> dict:
    TimeEntry = _get_or_create_model(db)
    entry = db.query(TimeEntry).filter(
        TimeEntry.id == entry_id,
        TimeEntry.organization_id == user.organization_id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Registro de tiempo no encontrado")
    entry.deleted_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": entry_id, "status": "deleted"}
