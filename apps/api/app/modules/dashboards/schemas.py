from typing import Optional, List

from pydantic import BaseModel


# ── KPI block ────────────────────────────────────────────────────────────────

class KPIs(BaseModel):
    new_leads: int = 0
    active_proposals: int = 0
    open_matters: int = 0
    overdue_invoices: int = 0


# ── Chart aggregations ──────────────────────────────────────────────────────

class LeadsByStatus(BaseModel):
    status: str
    count: int


class MattersByType(BaseModel):
    type: str
    count: int


# ── List items ───────────────────────────────────────────────────────────────

class OverdueTaskItem(BaseModel):
    id: int
    title: str
    due_date: str
    assigned_to_name: str
    matter_title: Optional[str] = None

    model_config = {"from_attributes": True}


class CriticalDeadlineItem(BaseModel):
    id: int
    title: str
    due_date: str
    severity: str
    matter_title: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Top-level response ──────────────────────────────────────────────────────

class DashboardOverview(BaseModel):
    kpis: KPIs
    leads_by_status: List[LeadsByStatus]
    matters_by_type: List[MattersByType]
    overdue_tasks: List[OverdueTaskItem]
    critical_deadlines: List[CriticalDeadlineItem]
