from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ProposalCreate(BaseModel):
    client_id: int
    amount: Optional[int] = None
    description: Optional[str] = None  # maps to strategy_summary_text
    valid_days: Optional[int] = None   # used to compute expires_at


class ProposalUpdate(BaseModel):
    amount: Optional[int] = None
    currency: Optional[str] = None
    payment_terms_text: Optional[str] = None
    strategy_summary_text: Optional[str] = None
    expires_at: Optional[datetime] = None


class TransitionRequest(BaseModel):
    action: str  # "sent", "accepted", "rejected"


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ProposalResponse(BaseModel):
    """Shape expected by the frontend list view."""
    id: int
    client_name: Optional[str] = None
    client_id: Optional[int] = None
    amount: Optional[int] = None
    status: str
    sent_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_by_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TimelineEntry(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    timestamp: datetime
    type: str       # e.g. "status_change", "created", etc.
    actor: Optional[str] = None


class ProposalDetailResponse(BaseModel):
    """Shape expected by the frontend detail view."""
    id: int
    client_id: Optional[int] = None
    client_name: Optional[str] = None
    amount: Optional[int] = None
    status: str
    description: Optional[str] = None  # = strategy_summary_text
    sent_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    timeline: List[TimelineEntry] = []

    model_config = {"from_attributes": True}


class ProposalListResponse(BaseModel):
    items: List[ProposalResponse]
    total: int


class ProposalPipeline(BaseModel):
    """Proposals grouped by status for pipeline/kanban view."""
    draft: List[ProposalResponse] = []
    sent: List[ProposalResponse] = []
    accepted: List[ProposalResponse] = []
    rejected: List[ProposalResponse] = []
    expired: List[ProposalResponse] = []


class AcceptProposalResponse(BaseModel):
    proposal: ProposalResponse
    contract_id: int
    message: str
