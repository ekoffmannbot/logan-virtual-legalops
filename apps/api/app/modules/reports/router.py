"""Reports & Analytics endpoints for Logan Virtual."""

from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.permissions import Action, check_permission
from app.modules.reports import service

router = APIRouter()


@router.get("/productivity")
def report_productivity(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    lawyer_id: Optional[int] = Query(None),
    user=Depends(check_permission("reports", Action.READ)),
    db: Session = Depends(get_db),
):
    return service.get_productivity_report(db, user.organization_id, start_date, end_date, lawyer_id)


@router.get("/financial")
def report_financial(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user=Depends(check_permission("reports", Action.READ)),
    db: Session = Depends(get_db),
):
    return service.get_financial_report(db, user.organization_id, start_date, end_date)


@router.get("/sla-compliance")
def report_sla_compliance(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user=Depends(check_permission("reports", Action.READ)),
    db: Session = Depends(get_db),
):
    return service.get_sla_compliance_report(db, user.organization_id, start_date, end_date)


@router.get("/lead-conversion")
def report_lead_conversion(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user=Depends(check_permission("reports", Action.READ)),
    db: Session = Depends(get_db),
):
    return service.get_lead_conversion_report(db, user.organization_id, start_date, end_date)


@router.get("/collections-aging")
def report_collections_aging(
    user=Depends(check_permission("reports", Action.READ)),
    db: Session = Depends(get_db),
):
    return service.get_collections_aging_report(db, user.organization_id)


@router.get("/export/{report_type}")
def export_report(
    report_type: str,
    format: str = Query("json"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    user=Depends(check_permission("reports", Action.EXPORT)),
    db: Session = Depends(get_db),
):
    return service.export_report(db, user.organization_id, report_type, format, start_date, end_date)
