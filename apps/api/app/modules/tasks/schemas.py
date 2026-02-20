from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


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


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_user_id: Optional[int] = None
    due_at: Optional[datetime] = None
