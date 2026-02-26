"""Tests for the agents REST API endpoints."""

import pytest


def test_agents_service_imports():
    """Verify agent service module loads."""
    from app.modules.agents.service import AgentService
    assert AgentService is not None


def test_agents_schemas_imports():
    """Verify agent schemas load correctly."""
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
    )
    assert AgentOut is not None
    assert ExecuteRequest is not None


def test_agents_router_imports():
    """Verify agent router has expected routes."""
    from app.modules.agents.router import router
    routes = [r.path for r in router.routes]
    assert "/" in routes or "/{agent_id}" in routes, f"Routes: {routes}"


def test_agent_bus_imports():
    """Verify agent bus loads."""
    from app.core.agent_bus import AgentBus
    assert AgentBus is not None


def test_workflows_imports():
    """Verify workflow definitions load."""
    from app.core.workflows import list_workflows, WORKFLOWS
    workflows = list_workflows()
    assert len(workflows) >= 5, f"Expected 5+ workflows, got {len(workflows)}"


def test_workflow_keys():
    """Verify expected workflow keys exist."""
    from app.core.workflows import WORKFLOWS

    expected_keys = {
        "new_lead",
        "proposal_preparation",
        "collections_flow",
        "notary_flow",
        "judicial_followup",
        "system_maintenance",
    }
    actual_keys = set(WORKFLOWS.keys())
    for key in expected_keys:
        assert key in actual_keys, f"Missing workflow '{key}'"
