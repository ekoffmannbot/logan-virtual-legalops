from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ── List item (GET /email-tickets) ───────────────────────────────
class EmailTicketItem(BaseModel):
    id: int
    subject: str
    from_email: str
    from_name: str
    received_at: datetime
    status: str
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    sla_24h_deadline: Optional[datetime] = None
    sla_48h_deadline: Optional[datetime] = None
    sla_24h_met: Optional[bool] = None
    sla_48h_met: Optional[bool] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Detail (GET /email-tickets/{id}) ─────────────────────────────
class EmailTicketDetail(BaseModel):
    id: int
    subject: str
    from_email: str
    from_name: str
    body: Optional[str] = None
    received_at: datetime
    status: str
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    sla_24h_deadline: Optional[datetime] = None
    sla_48h_deadline: Optional[datetime] = None
    sla_24h_met: Optional[bool] = None
    sla_48h_met: Optional[bool] = None
    draft_response: Optional[str] = None
    matter_id: Optional[int] = None
    matter_title: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Stats (GET /email-tickets/stats) ─────────────────────────────
class EmailTicketStats(BaseModel):
    total: int
    open: int
    sla_at_risk: int
    sla_breached: int
    unassigned: int


# ── Timeline (GET /email-tickets/{id}/timeline) ──────────────────
class TimelineEvent(BaseModel):
    id: int
    action: str
    actor_name: Optional[str] = None
    created_at: datetime
    detail: Optional[str] = None


# ── PATCH /email-tickets/{id} ────────────────────────────────────
class EmailTicketPatchRequest(BaseModel):
    draft_response: Optional[str] = None


# ── POST /email-tickets/{id}/transition ──────────────────────────
class TransitionRequest(BaseModel):
    action: str


# ── POST /email-tickets/{id}/send ────────────────────────────────
class SendRequest(BaseModel):
    body: str
