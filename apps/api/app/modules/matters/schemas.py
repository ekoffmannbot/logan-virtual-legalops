from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, computed_field


# ── Request schemas ──────────────────────────────────────────────

class MatterCreate(BaseModel):
    title: str
    client_id: int
    matter_type: str
    description: Optional[str] = None


class MatterUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    court_name: Optional[str] = None
    rol_number: Optional[str] = None
    status: Optional[str] = None


class AssignRequest(BaseModel):
    user_id: int


class TransitionRequest(BaseModel):
    action: str  # "open", "closed", "suspended_nonpayment", "terminated"


# ── List / simple response ───────────────────────────────────────

class MatterResponse(BaseModel):
    """Used by GET /matters (list) and POST /matters (create)."""
    id: int
    title: str
    client_name: str
    client_id: int
    matter_type: str
    status: str
    assigned_lawyer_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MatterListResponse(BaseModel):
    items: List[MatterResponse]
    total: int


# ── Nested sub-schemas for detail view ───────────────────────────

class DeadlineItem(BaseModel):
    id: int
    title: str
    due_date: datetime
    severity: str
    completed: bool

    model_config = {"from_attributes": True}


class GestionItem(BaseModel):
    id: int
    title: str
    gestion_type: str
    date: Optional[datetime] = None
    result: str

    model_config = {"from_attributes": True}


class DocumentItem(BaseModel):
    id: int
    filename: str
    doc_type: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class TaskItem(BaseModel):
    id: int
    title: str
    status: str
    due_date: Optional[datetime] = None
    assigned_to_name: Optional[str] = None

    model_config = {"from_attributes": True}


class CommunicationItem(BaseModel):
    id: int
    channel: str
    subject: Optional[str] = None
    snippet: Optional[str] = None
    sent_at: datetime
    direction: str

    model_config = {"from_attributes": True}


class TimelineEvent(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    timestamp: datetime
    type: str  # "audit_log", "communication", "task", etc.
    actor: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Detail response ──────────────────────────────────────────────

class MatterDetailResponse(BaseModel):
    """Used by GET /matters/{id}."""
    id: int
    title: str
    description: Optional[str] = None
    client_id: int
    client_name: str
    matter_type: str
    status: str
    assigned_lawyer_name: Optional[str] = None
    rit: Optional[str] = None
    court: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    deadlines: List[DeadlineItem] = []
    gestiones: List[GestionItem] = []
    documents: List[DocumentItem] = []
    tasks: List[TaskItem] = []
    communications: List[CommunicationItem] = []
    timeline: List[TimelineEvent] = []

    model_config = {"from_attributes": True}
