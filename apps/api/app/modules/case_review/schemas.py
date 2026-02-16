from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class OpenMatterResponse(BaseModel):
    """A matter shown in the case review open-matters list."""
    id: int
    title: str
    court: Optional[str] = None
    rol_number: Optional[str] = None
    client_name: Optional[str] = None
    status: str
    last_movement_at: Optional[datetime] = None
    assigned_to: Optional[str] = None


class OpenMattersListResponse(BaseModel):
    items: List[OpenMatterResponse]
    total: int


class MovementCreate(BaseModel):
    description: str
    has_deadline: bool = False
    deadline_date: Optional[datetime] = None
    complexity: Optional[str] = None  # low, med, high


class MovementResponse(BaseModel):
    court_action_id: int
    matter_id: int
    description: str
    deadline_id: Optional[int] = None
    message: str


class NoMovementResponse(BaseModel):
    matter_id: int
    message: str
