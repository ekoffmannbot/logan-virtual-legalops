from typing import Optional

from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str
    matter_id: Optional[int] = None
    action: Optional[str] = None


class DraftEmailRequest(BaseModel):
    matter_id: Optional[int] = None
    context: Optional[str] = None


class DraftProposalRequest(BaseModel):
    matter_id: Optional[int] = None
    context: Optional[str] = None


class SummarizeCaseRequest(BaseModel):
    matter_id: int


class AIResponse(BaseModel):
    response: str
