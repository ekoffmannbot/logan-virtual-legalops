from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Create / Update
# ---------------------------------------------------------------------------

class LeadCreate(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str
    notes: Optional[str] = None


class LeadUpdate(BaseModel):
    source: Optional[str] = None
    full_name: Optional[str] = None
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class LeadResponse(BaseModel):
    """Flat lead returned by GET /leads and POST /leads."""
    id: int
    full_name: str
    source: str
    status: str
    phone: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    items: List[LeadResponse]
    total: int


class TimelineEntry(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    timestamp: datetime
    type: str        # "audit" | "communication"
    actor: Optional[str] = None


class LeadDetailResponse(BaseModel):
    """Extended lead returned by GET /leads/{id}."""
    id: int
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    source: str
    status: str
    notes: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    timeline: List[TimelineEntry] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Transition
# ---------------------------------------------------------------------------

class TransitionRequest(BaseModel):
    action: str  # "contacted" | "meeting_scheduled" | "proposal_sent" | "won" | "lost"


# ---------------------------------------------------------------------------
# Legacy action schemas (kept for backward compatibility)
# ---------------------------------------------------------------------------

class ContactAttemptCreate(BaseModel):
    channel: str
    direction: str = "outbound"
    subject: Optional[str] = None
    body_text: Optional[str] = None
    from_value: Optional[str] = None
    to_value: Optional[str] = None


class ScheduleMeetingRequest(BaseModel):
    meeting_notes: Optional[str] = None


class ConvertToClientResponse(BaseModel):
    lead_id: int
    client_id: int
    message: str
