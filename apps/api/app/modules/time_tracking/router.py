"""
Time tracking for billable hours — essential for law firms.
"""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Action, check_permission
from app.modules.time_tracking import service

router = APIRouter()


class TimeEntryCreate(BaseModel):
    matter_id: int
    description: str = Field(..., min_length=1, max_length=500)
    hours: float = Field(..., gt=0, le=24)
    rate_per_hour: float = Field(default=0, ge=0)
    billable: bool = True
    entry_date: date


class TimeEntryUpdate(BaseModel):
    description: Optional[str] = None
    hours: Optional[float] = None
    rate_per_hour: Optional[float] = None
    billable: Optional[bool] = None


@router.get("/")
def list_time_entries(
    matter_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user=Depends(check_permission("time_tracking", Action.READ)),
    db: Session = Depends(get_db),
):
    """List time entries with optional filters."""
    return service.list_entries(db, user.organization_id, matter_id, user_id, start_date, end_date)


@router.get("/summary")
def time_summary(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    group_by: str = Query("user", pattern="^(user|matter|client)$"),
    user=Depends(check_permission("time_tracking", Action.READ)),
    db: Session = Depends(get_db),
):
    """Summary of hours grouped by user, matter, or client."""
    return service.get_summary(db, user.organization_id, start_date, end_date, group_by)


@router.post("/")
def create_time_entry(
    payload: TimeEntryCreate,
    user=Depends(check_permission("time_tracking", Action.CREATE)),
    db: Session = Depends(get_db),
):
    """Log a time entry for a matter."""
    return service.create_entry(db, user, payload.model_dump())


@router.patch("/{entry_id}")
def update_time_entry(
    entry_id: int,
    payload: TimeEntryUpdate,
    user=Depends(check_permission("time_tracking", Action.UPDATE)),
    db: Session = Depends(get_db),
):
    """Update a time entry."""
    return service.update_entry(db, user, entry_id, payload.model_dump(exclude_unset=True))


@router.delete("/{entry_id}")
def delete_time_entry(
    entry_id: int,
    user=Depends(check_permission("time_tracking", Action.DELETE)),
    db: Session = Depends(get_db),
):
    """Soft-delete a time entry."""
    return service.delete_entry(db, user, entry_id)
