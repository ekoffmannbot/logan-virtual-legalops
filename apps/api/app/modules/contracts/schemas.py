from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ── Request schemas ──────────────────────────────────────────────

class ContractCreate(BaseModel):
    client_id: int
    matter_id: Optional[int] = None
    notes: Optional[str] = None


class ContractUpdate(BaseModel):
    notes: Optional[str] = None
    drafted_by_user_id: Optional[int] = None
    reviewed_by_user_id: Optional[int] = None


class TransitionRequest(BaseModel):
    action: str


# ── List item (GET /contracts) ───────────────────────────────────

class ContractListItem(BaseModel):
    id: int
    title: str = ""
    client_name: Optional[str] = None
    type: str = "honorarios"
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    monthly_fee: Optional[int] = None
    currency: str = "CLP"
    process_id: str = "contrato-mandato"
    drafted_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    signed: bool = False
    signed_at: Optional[datetime] = None
    created_at: datetime
    matter_id: Optional[int] = None
    matter_title: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Detail (GET /contracts/{id}) ─────────────────────────────────

class ContractDetail(BaseModel):
    id: int
    client_name: Optional[str] = None
    client_id: int
    matter_id: Optional[int] = None
    matter_title: Optional[str] = None
    status: str
    drafted_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    signed: bool = False
    signed_at: Optional[datetime] = None
    scanned_document_url: Optional[str] = None
    content: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Stats (GET /contracts/stats) ─────────────────────────────────

class ContractStats(BaseModel):
    total: int
    draft: int
    in_review: int
    signed: int
    pending_signature: int


# ── Timeline (GET /contracts/{id}/timeline) ──────────────────────

class TimelineEvent(BaseModel):
    id: int
    action: str
    description: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
