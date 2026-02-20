from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel


# ── Invoice (list view) ─────────────────────────────────────────────────────

class InvoiceResponse(BaseModel):
    id: int
    client_name: str
    amount: int
    currency: str
    due_date: date
    status: str
    matter_title: Optional[str] = None
    invoice_number: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Invoice (detail view) ──────────────────────────────────────────────────

class InvoiceDetailResponse(BaseModel):
    id: int
    invoice_number: str
    client_name: str
    client_id: int
    matter_id: Optional[int] = None
    matter_title: Optional[str] = None
    amount: int
    amount_paid: int
    currency: str
    due_date: date
    status: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Payment ─────────────────────────────────────────────────────────────────

class PaymentCreate(BaseModel):
    amount: int
    method: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    amount: int
    currency: str
    method: Optional[str] = None
    notes: Optional[str] = None
    recorded_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Collection Case (list view) ────────────────────────────────────────────

class CollectionCaseResponse(BaseModel):
    id: int
    invoice_id: int
    invoice_number: str
    client_name: str
    status: str
    last_contact_at: Optional[datetime] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None
    amount_owed: int
    currency: str

    model_config = {"from_attributes": True}


# ── Collection Case (detail view) ──────────────────────────────────────────

class CollectionCaseDetailResponse(BaseModel):
    id: int
    invoice_id: int
    invoice_number: str
    client_name: str
    status: str
    last_contact_at: Optional[datetime] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None
    amount_owed: int
    currency: str
    notes: Optional[str] = None
    suspended_at: Optional[datetime] = None
    terminated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Stats ───────────────────────────────────────────────────────────────────

class CollectionStatsResponse(BaseModel):
    total_invoices: int
    total_outstanding: int
    overdue_count: int
    overdue_amount: int
    collection_rate: float
    active_cases: int


# ── Timeline ────────────────────────────────────────────────────────────────

class TimelineEventResponse(BaseModel):
    id: int
    event_type: str
    description: str
    actor: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Transition ──────────────────────────────────────────────────────────────

class InvoiceTransitionRequest(BaseModel):
    action: str
