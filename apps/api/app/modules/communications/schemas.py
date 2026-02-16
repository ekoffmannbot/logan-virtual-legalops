from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CommunicationCreate(BaseModel):
    entity_type: Optional[str] = None  # e.g. "client", "lead", "matter", "contract"
    entity_id: Optional[int] = None
    channel: str  # CommunicationChannelEnum value: phone, email, whatsapp, in_person
    direction: str  # CommunicationDirectionEnum value: inbound, outbound
    subject: Optional[str] = None
    body_text: Optional[str] = None
    from_value: Optional[str] = None
    to_value: Optional[str] = None


class CommunicationResponse(BaseModel):
    id: int
    organization_id: int
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    channel: str
    direction: str
    subject: Optional[str] = None
    body_text: Optional[str] = None
    from_value: Optional[str] = None
    to_value: Optional[str] = None
    status: str
    created_by_user_id: Optional[int] = None
    external_message_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CommunicationListResponse(BaseModel):
    items: List[CommunicationResponse]
    total: int
