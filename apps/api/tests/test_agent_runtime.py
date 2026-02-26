"""Tests for AgentRuntime with mocked Anthropic API."""

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from dataclasses import dataclass


def test_agent_runtime_imports():
    """Verify AgentRuntime module loads without errors."""
    from app.core.agent_runtime import AgentRuntime, EscalationRequired
    assert AgentRuntime is not None
    assert EscalationRequired is not None


def test_anthropic_client_imports():
    """Verify AnthropicClient module loads without errors."""
    from app.core.anthropic_client import AnthropicClient, MessageResult
    assert AnthropicClient is not None
    assert MessageResult is not None


def test_escalation_manager_imports():
    """Verify EscalationManager module loads without errors."""
    from app.core.escalation import EscalationManager
    assert EscalationManager is not None


def test_escalation_should_escalate_by_error_count():
    """Test escalation threshold logic via should_escalate error_count param."""
    from app.core.escalation import EscalationManager

    db = MagicMock()
    mgr = EscalationManager(db=db, organization_id=1)

    # Mock agent
    agent = MagicMock()
    agent.skills = []

    # Below threshold — should not escalate
    should, reason = mgr.should_escalate(agent, error_count=1)
    assert not should

    should, reason = mgr.should_escalate(agent, error_count=2)
    assert not should

    # At/above threshold (default=3) — should escalate
    should, reason = mgr.should_escalate(agent, error_count=3)
    assert should
    assert "fallado" in reason or "veces" in reason


def test_escalation_record_and_clear_errors():
    """Test recording and clearing consecutive errors."""
    from app.core.escalation import EscalationManager

    db = MagicMock()
    mgr = EscalationManager(db=db, organization_id=1)

    # Record errors for agent 1
    assert mgr.record_error(agent_id=1) == 1
    assert mgr.record_error(agent_id=1) == 2

    # Clear errors
    mgr.clear_errors(agent_id=1)

    # After clearing, record starts fresh
    assert mgr.record_error(agent_id=1) == 1


def test_escalation_tool_name_always_escalates():
    """Test that dangerous tool names always trigger escalation."""
    from app.core.escalation import EscalationManager, ALWAYS_ESCALATE_ACTIONS

    db = MagicMock()
    mgr = EscalationManager(db=db, organization_id=1)

    agent = MagicMock()
    agent.skills = []

    for tool_name in ALWAYS_ESCALATE_ACTIONS:
        should, reason = mgr.should_escalate(agent, tool_name=tool_name)
        assert should, f"Expected escalation for tool '{tool_name}'"
        assert "aprobación" in reason.lower() or "externa" in reason.lower()


def test_message_result_dataclass():
    """Test MessageResult creation."""
    from app.core.anthropic_client import MessageResult

    result = MessageResult(
        content="Hello",
        tool_calls=[],
        stop_reason="end_turn",
        input_tokens=10,
        output_tokens=20,
        latency_ms=150.0,
        model_used="claude-sonnet-4-20250514",
    )
    assert result.content == "Hello"
    assert result.input_tokens == 10
    assert result.output_tokens == 20
    assert result.model_used == "claude-sonnet-4-20250514"
