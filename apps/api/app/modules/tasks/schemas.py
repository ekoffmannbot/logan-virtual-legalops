from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, field_validator


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    type: str
    status: str
    assigned_to: Optional[int] = None
    assigned_to_name: Optional[str] = None
    due_date: Optional[datetime] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    entity_label: Optional[str] = None
    priority: Optional[str] = None
    created_at: datetime


class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    total: int


class TaskStatsResponse(BaseModel):
    total: int
    pending: int
    in_progress: int
    completed: int
    overdue: int


_TASK_TYPE_ALIASES = {
    "seguimiento": "follow_up_proposal",
    "llamada": "callback",
    "revision": "review_contract",
    "notarial": "notary_contact",
    "tribunal": "court_filing",
    "cobranza": "collection_reminder",
    "email": "email_response",
    "scraper": "scraper_review",
}
_VALID_TASK_TYPES = {
    "follow_up_proposal", "callback", "review_contract", "notary_contact",
    "court_filing", "collection_reminder", "email_response", "scraper_review", "general",
}


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    task_type: str = "general"
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    assigned_to_user_id: Optional[int] = None
    assigned_role: Optional[str] = None
    due_at: Optional[datetime] = None
    sla_policy: str = "none"

    @field_validator("task_type")
    @classmethod
    def normalize_task_type(cls, v: str) -> str:
        low = v.lower().strip()
        if low in _TASK_TYPE_ALIASES:
            return _TASK_TYPE_ALIASES[low]
        if low in _VALID_TASK_TYPES:
            return low
        raise ValueError(
            f"Tipo de tarea no válido: '{v}'. "
            f"Valores: {sorted(_VALID_TASK_TYPES | set(_TASK_TYPE_ALIASES.keys()))}"
        )


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    due_at: Optional[datetime] = None
