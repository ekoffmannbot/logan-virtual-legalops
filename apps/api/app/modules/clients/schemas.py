from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


class ClientCreate(BaseModel):
    full_name: str
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientUpdate(BaseModel):
    full_name: Optional[str] = None
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class ClientResponse(BaseModel):
    id: int
    full_name: str
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("full_name", mode="before")
    @classmethod
    def _coerce_full_name(cls, v, info):
        """Accept full_name_or_company from the ORM model and expose as full_name."""
        return v


class ClientDetailResponse(BaseModel):
    """Full client detail including address, used in 360 and single-get."""
    id: int
    full_name: str
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    items: List[ClientResponse]
    total: int


# ── 360 sub-schemas ──────────────────────────────────────────────────────────

class MatterSummary(BaseModel):
    id: int
    title: str
    matter_type: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentSummary(BaseModel):
    id: int
    filename: str
    doc_type: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class CommunicationSummary(BaseModel):
    id: int
    channel: str
    subject: Optional[str] = None
    snippet: Optional[str] = None
    sent_at: datetime
    direction: str

    model_config = {"from_attributes": True}


class Client360Response(BaseModel):
    id: int
    full_name: str
    rut: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime
    matters: List[MatterSummary]
    documents: List[DocumentSummary]
    communications: List[CommunicationSummary]
