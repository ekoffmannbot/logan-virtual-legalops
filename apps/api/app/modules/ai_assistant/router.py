from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.ai_assistant import service
from app.modules.ai_assistant.schemas import (
    ChatRequest,
    DraftEmailRequest,
    DraftProposalRequest,
    SummarizeCaseRequest,
    AIResponse,
)

router = APIRouter()


@router.post("/chat", response_model=AIResponse)
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """General AI chat. Optionally scoped to a matter."""
    return service.chat(
        db, data.message, data.matter_id, data.action, current_user.organization_id
    )


@router.post("/draft-email", response_model=AIResponse)
def draft_email(
    data: DraftEmailRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Draft an email using AI."""
    return service.draft_email(
        db, data.matter_id, data.context, current_user.organization_id
    )


@router.post("/draft-proposal", response_model=AIResponse)
def draft_proposal(
    data: DraftProposalRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Draft a proposal using AI."""
    return service.draft_proposal(
        db, data.matter_id, data.context, current_user.organization_id
    )


@router.post("/summarize-case", response_model=AIResponse)
def summarize_case(
    data: SummarizeCaseRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Summarize a case/matter using AI."""
    return service.summarize_case(db, data.matter_id, current_user.organization_id)
