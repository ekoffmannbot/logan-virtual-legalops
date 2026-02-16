from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CourtActionCreate(BaseModel):
    matter_id: int
    action_type: str
    method: str  # CourtActionMethodEnum value: electronic | in_person
    must_appear_in_court: bool = False
    description: Optional[str] = None


class CourtActionUpdate(BaseModel):
    action_type: Optional[str] = None
    description: Optional[str] = None
    must_appear_in_court: Optional[bool] = None


class CourtActionResponse(BaseModel):
    id: int
    organization_id: int
    matter_id: int
    action_type: str
    method: str
    must_appear_in_court: bool
    status: str
    description: Optional[str] = None
    sent_at: Optional[datetime] = None
    receipt_confirmed_at: Optional[datetime] = None
    evidence_document_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourtActionListResponse(BaseModel):
    items: List[CourtActionResponse]
    total: int


class AdvanceStatusRequest(BaseModel):
    new_status: str


class UploadEvidenceRequest(BaseModel):
    document_id: int
