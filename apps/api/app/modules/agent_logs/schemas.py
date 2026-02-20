from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


class AgentLogEntry(BaseModel):
    id: str
    agentName: str
    action: str
    detail: Optional[str] = None
    timestamp: datetime
    status: str  # completed, pending_approval
    entityType: Optional[str] = None
    entityId: Optional[str] = None
    actionRequired: bool = False
