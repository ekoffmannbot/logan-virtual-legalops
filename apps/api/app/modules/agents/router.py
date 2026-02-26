"""REST API router for Agents module."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from app.modules.agents.schemas import (
    AgentOut,
    AgentSummaryOut,
    AgentUpdate,
    SkillOut,
    SkillUpdate,
    ExecuteRequest,
    ExecuteResponse,
    AgentTaskOut,
    ConversationMessageOut,
    AgentCostSummary,
    WorkflowExecuteRequest,
    TaskResolveRequest,
    TaskResolveResponse,
)
from app.modules.agents.service import AgentService

router = APIRouter(tags=["agents"])


def _get_service(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return AgentService(db, user.organization_id), user, db


# ── List & Detail ─────────────────────────────────────────────────────────────

@router.get("/", response_model=list[AgentSummaryOut])
def list_agents(deps=Depends(_get_service)):
    svc, user, db = deps
    agents = svc.list_agents()
    return [
        AgentSummaryOut(
            id=a.id,
            display_name=a.display_name,
            role=a.role if isinstance(a.role, str) else a.role.value,
            model_name=a.model_name,
            is_active=a.is_active,
            skill_count=len(a.skills),
        )
        for a in agents
    ]


@router.get("/workflows")
def list_workflows(deps=Depends(_get_service)):
    """List all available agent workflows."""
    from app.core.workflows import WORKFLOWS
    return [
        {"key": k, "name": w.name, "description": w.description, "steps": len(w.steps)}
        for k, w in WORKFLOWS.items()
    ]


@router.get("/{agent_id}", response_model=AgentOut)
def get_agent(agent_id: int, deps=Depends(_get_service)):
    svc, user, db = deps
    agent = svc.get_agent(agent_id)
    if not agent:
        raise HTTPException(404, "Agente no encontrado")
    return agent


# ── Update Agent ──────────────────────────────────────────────────────────────

@router.patch("/{agent_id}", response_model=AgentOut)
def update_agent(agent_id: int, body: AgentUpdate, deps=Depends(_get_service)):
    svc, user, db = deps
    agent = svc.update_agent(agent_id, body.model_dump(exclude_unset=True))
    if not agent:
        raise HTTPException(404, "Agente no encontrado")
    db.commit()
    return agent


# ── Update Skill ──────────────────────────────────────────────────────────────

@router.patch("/{agent_id}/skills/{skill_id}", response_model=SkillOut)
def update_skill(agent_id: int, skill_id: int, body: SkillUpdate, deps=Depends(_get_service)):
    svc, user, db = deps
    skill = svc.update_skill(agent_id, skill_id, body.model_dump(exclude_unset=True))
    if not skill:
        raise HTTPException(404, "Skill no encontrado")
    db.commit()
    return skill


# ── Execute Agent ─────────────────────────────────────────────────────────────

@router.post("/{agent_id}/execute", response_model=ExecuteResponse)
def execute_agent(agent_id: int, body: ExecuteRequest, deps=Depends(_get_service)):
    svc, user, db = deps
    result = svc.execute_agent(
        agent_id=agent_id,
        message=body.message,
        thread_id=body.thread_id,
        context=body.context,
        task_type=body.task_type or "chat",
        user_id=user.id,
    )
    db.commit()
    return ExecuteResponse(**result)


# ── Agent Tasks ───────────────────────────────────────────────────────────────

@router.get("/{agent_id}/tasks", response_model=list[AgentTaskOut])
def get_agent_tasks(
    agent_id: int,
    status: Optional[str] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    deps=Depends(_get_service),
):
    svc, user, db = deps
    tasks = svc.get_agent_tasks(agent_id, status=status, limit=limit, offset=offset)
    return tasks


# ── Agent Conversations ───────────────────────────────────────────────────────

@router.get("/{agent_id}/conversations", response_model=list[ConversationMessageOut])
def get_conversations(
    agent_id: int,
    thread_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    deps=Depends(_get_service),
):
    svc, user, db = deps
    return svc.get_conversations(agent_id, thread_id=thread_id, limit=limit)


# ── Agent Costs ───────────────────────────────────────────────────────────────

@router.get("/{agent_id}/costs", response_model=AgentCostSummary)
def get_agent_costs(agent_id: int, deps=Depends(_get_service)):
    svc, user, db = deps
    result = svc.get_agent_costs(agent_id)
    if "error" in result:
        raise HTTPException(404, result["error"])
    return AgentCostSummary(**result)


# ── Task Resolution (Escalation Approve/Reject) ──────────────────────────────

@router.post("/{agent_id}/tasks/{task_id}/resolve", response_model=TaskResolveResponse)
def resolve_task(
    agent_id: int,
    task_id: int,
    body: TaskResolveRequest,
    deps=Depends(_get_service),
):
    svc, user, db = deps
    result = svc.resolve_task(agent_id, task_id, body.action, body.notes, user.id)
    if "error" in result:
        raise HTTPException(400, result["error"])
    db.commit()
    return TaskResolveResponse(**result)


# ── Workflows ─────────────────────────────────────────────────────────────────

@router.post("/workflows/{workflow_key}")
def execute_workflow(workflow_key: str, body: WorkflowExecuteRequest, deps=Depends(_get_service)):
    svc, user, db = deps
    try:
        from app.core.workflows import execute_workflow as run_workflow
        result = run_workflow(
            db=db,
            org_id=user.organization_id,
            workflow_key=workflow_key,
            context=body.context or {},
            message=body.message,
        )
        db.commit()
        return result
    except ValueError as exc:
        raise HTTPException(400, str(exc))
