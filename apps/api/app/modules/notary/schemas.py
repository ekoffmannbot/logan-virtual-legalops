from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------
class NotaryDocCreate(BaseModel):
    client_id: int
    matter_id: Optional[int] = None
    doc_type: str  # NotaryDocTypeEnum value
    notary_name: Optional[str] = None
    notes: Optional[str] = None


class NotaryDocUpdate(BaseModel):
    notary_name: Optional[str] = None
    notes: Optional[str] = None


class TransitionRequest(BaseModel):
    action: str


class ContactAttemptCreate(BaseModel):
    type: str        # CommunicationChannelEnum value
    description: str
    outcome: Optional[str] = None


# ---------------------------------------------------------------------------
# Response schemas  (field names match what the frontend expects)
# ---------------------------------------------------------------------------
class NotaryDocListItem(BaseModel):
    """GET /notary  -- each item in the list."""
    id: int
    client_name: str
    document_type: str        # mapped from model.doc_type
    status: str
    notary_office: Optional[str] = None  # mapped from model.notary_name
    sent_at: Optional[datetime] = None
    notary_signed_at: Optional[datetime] = None
    client_signed_at: Optional[datetime] = None
    matter_id: Optional[int] = None
    matter_title: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotaryDocDetail(BaseModel):
    """GET /notary/{id}  -- full detail view."""
    id: int
    client_name: str
    client_id: int
    matter_id: Optional[int] = None
    matter_title: Optional[str] = None
    document_type: str
    status: str
    notary_office: Optional[str] = None
    notary_contact: Optional[str] = None
    sent_at: Optional[datetime] = None
    notary_signed_at: Optional[datetime] = None
    client_signed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotaryStats(BaseModel):
    """GET /notary/stats"""
    total: int
    pending: int
    at_notary: int
    completed: int


class TimelineEvent(BaseModel):
    """GET /notary/{id}/timeline"""
    id: int
    action: str
    description: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactAttemptResponse(BaseModel):
    """GET /notary/{id}/contact-attempts"""
    id: int
    type: str
    description: Optional[str] = None
    outcome: Optional[str] = None
    user_name: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
