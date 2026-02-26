"""Pydantic schemas for the Agents module."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ── Skill Schemas ─────────────────────────────────────────────────────────────

class SkillOut(BaseModel):
    id: int
    skill_key: str
    skill_name: str
    is_autonomous: bool
    is_enabled: bool
    config_json: Optional[dict] = None

    model_config = {"from_attributes": True}


class SkillUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    is_autonomous: Optional[bool] = None
    config_json: Optional[dict] = None


# ── Agent Schemas ─────────────────────────────────────────────────────────────

class AgentOut(BaseModel):
    id: int
    display_name: str
    role: str
    avatar_url: Optional[str] = None
    model_provider: str
    model_name: str
    system_prompt: str
    temperature: float
    max_tokens: int
    is_active: bool
    skills: list[SkillOut] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AgentSummaryOut(BaseModel):
    id: int
    display_name: str
    role: str
    model_name: str
    is_active: bool
    skill_count: int = 0

    model_config = {"from_attributes": True}


class AgentUpdate(BaseModel):
    display_name: Optional[str] = None
    model_name: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


# ── Execution Schemas ─────────────────────────────────────────────────────────

class ExecuteRequest(BaseModel):
    message: str
    thread_id: Optional[str] = None
    context: Optional[dict] = None
    task_type: Optional[str] = "chat"


class ExecuteResponse(BaseModel):
    response: str
    thread_id: str
    task_id: Optional[int] = None
    status: str
    tokens: Optional[dict] = None
    latency_ms: Optional[int] = None
    notification_id: Optional[int] = None
    error: Optional[str] = None


# ── Task Schemas ──────────────────────────────────────────────────────────────

class AgentTaskOut(BaseModel):
    id: int
    agent_id: int
    task_type: str
    trigger_type: str
    status: str
    input_data: Optional[dict] = None
    output_data: Optional[dict] = None
    error_message: Optional[str] = None
    escalation_reason: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Conversation Schemas ──────────────────────────────────────────────────────

class ConversationMessageOut(BaseModel):
    id: int
    thread_id: str
    message_role: str
    content: str
    tool_calls: Optional[dict] = None
    model_used: Optional[str] = None
    token_count_input: Optional[int] = None
    token_count_output: Optional[int] = None
    latency_ms: Optional[int] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Cost Schemas ──────────────────────────────────────────────────────────────

class AgentCostSummary(BaseModel):
    agent_id: int
    agent_name: str
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    total_tasks: int = 0
    estimated_cost_usd: float = 0.0


# ── Task Resolution Schemas ───────────────────────────────────────────────────

class TaskResolveRequest(BaseModel):
    action: str  # "approve" | "reject"
    notes: Optional[str] = None


class TaskResolveResponse(BaseModel):
    task_id: int
    new_status: str
    message: str


# ── Workflow Schemas ──────────────────────────────────────────────────────────

class WorkflowExecuteRequest(BaseModel):
    context: Optional[dict] = None
    message: Optional[str] = None
