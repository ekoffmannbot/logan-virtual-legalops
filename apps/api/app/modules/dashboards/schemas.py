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


# ── Action Items (Mission Control) ────────────────────────────────────────

class ActionItem(BaseModel):
    id: str
    type: str
    title: str
    subtitle: Optional[str] = None
    urgencyText: Optional[str] = None
    actionLabel: str
    actionHref: str
    secondaryLabel: Optional[str] = None
    secondaryHref: Optional[str] = None
    amount: Optional[str] = None


class InProgressItem(BaseModel):
    id: str
    type: str
    title: str
    subtitle: Optional[str] = None
    processId: Optional[str] = None
    status: str
    href: str


class CompletedItem(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = None
    type: str


class AgentInsight(BaseModel):
    agentName: str
    message: str
    type: str  # info, warning, suggestion


class QuickNumbers(BaseModel):
    leads: int = 0
    proposals: int = 0
    matters: int = 0
    overdue: int = 0


class ActionItemsResponse(BaseModel):
    urgent: List[ActionItem]
    today: List[ActionItem]
    inProgress: List[InProgressItem]
    completed: List[CompletedItem]
    agentInsights: List[AgentInsight]
    quickNumbers: QuickNumbers
