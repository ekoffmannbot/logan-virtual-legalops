"""Tests for the escalation system."""

import pytest
from unittest.mock import MagicMock


def test_always_escalate_actions():
    """Verify ALWAYS_ESCALATE_ACTIONS contains expected dangerous actions."""
    from app.core.escalation import ALWAYS_ESCALATE_ACTIONS

    expected = {"send_email", "file_court_document", "submit_to_notary", "make_payment"}
    for action in expected:
        assert action in ALWAYS_ESCALATE_ACTIONS, f"Missing escalation action: {action}"


def test_escalation_manager_per_agent():
    """Test that error counts are per-agent."""
    from app.core.escalation import EscalationManager

    db = MagicMock()
    mgr = EscalationManager(db=db, organization_id=1)

    # Record 3 errors for agent 1
    mgr.record_error(agent_id=1)
    mgr.record_error(agent_id=1)
    mgr.record_error(agent_id=1)

    # Only 1 error for agent 2
    mgr.record_error(agent_id=2)

    # Agent 1 at threshold, agent 2 not
    agent = MagicMock()
    agent.skills = []

    should_1, _ = mgr.should_escalate(agent, error_count=3)
    assert should_1

    should_2, _ = mgr.should_escalate(agent, error_count=1)
    assert not should_2


def test_escalation_creates_notification():
    """Test that escalate() creates DB records."""
    from app.core.escalation import EscalationManager

    db = MagicMock()
    mgr = EscalationManager(db=db, organization_id=1)

    # Mock the agent
    agent = MagicMock()
    agent.id = 1
    agent.display_name = "Abogado Senior"

    # Mock gerente query
    mock_gerente = MagicMock()
    mock_gerente.id = 99
    db.query.return_value.filter.return_value.first.return_value = mock_gerente

    notification_id = mgr.escalate(
        agent=agent,
        reason="Error threshold exceeded",
        task_id=42,
        context={"detail": "Test escalation"},
    )

    # Should have called db.add at least twice (notification + audit log)
    assert db.add.call_count >= 2
    # Should have flushed to get notification ID
    assert db.flush.called


def test_agent_dispatch_imports():
    """Verify agent_dispatch module loads."""
    from app.core.agent_dispatch import agent_draft, get_agent_id
    assert callable(agent_draft)
    assert callable(get_agent_id)


def test_escalation_skill_not_autonomous():
    """Test that non-autonomous skills trigger escalation."""
    from app.core.escalation import EscalationManager

    db = MagicMock()
    mgr = EscalationManager(db=db, organization_id=1)

    # Create agent with a non-autonomous skill
    agent = MagicMock()
    skill = MagicMock()
    skill.skill_key = "redaccion_legal"
    skill.skill_name = "Redacción Legal"
    skill.is_enabled = True
    skill.is_autonomous = False
    agent.skills = [skill]

    should, reason = mgr.should_escalate(agent, skill_key="redaccion_legal")
    assert should
    assert "aprobación manual" in reason.lower() or "redacción" in reason.lower()
