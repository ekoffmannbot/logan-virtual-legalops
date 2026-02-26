"""Tests for inter-agent messaging bus."""

import pytest
from unittest.mock import MagicMock, patch


def test_agent_bus_imports():
    """Verify AgentBus module loads."""
    from app.core.agent_bus import AgentBus, MAX_CONVERSATION_DEPTH
    assert AgentBus is not None


def test_agent_bus_depth_limit():
    """Test that conversation depth constant is defined."""
    from app.core.agent_bus import MAX_CONVERSATION_DEPTH
    assert MAX_CONVERSATION_DEPTH == 10


def test_agent_bus_constructor():
    """Test AgentBus takes db and organization_id."""
    from app.core.agent_bus import AgentBus

    db = MagicMock()
    bus = AgentBus(db=db, organization_id=1)
    assert bus.db is db
    assert bus.org_id == 1


def test_agent_bus_depth_exceeded():
    """Test that send_message returns depth_exceeded when thread is too deep."""
    from app.core.agent_bus import AgentBus, MAX_CONVERSATION_DEPTH

    db = MagicMock()
    bus = AgentBus(db=db, organization_id=1)

    # Mock thread depth at the limit
    db.query.return_value.filter.return_value.count.return_value = MAX_CONVERSATION_DEPTH

    result = bus.send_message(
        from_agent_id=1,
        to_agent_role="secretaria",
        message="Test message",
        thread_id="test-thread-123",
    )

    assert result["status"] == "depth_exceeded"
    assert "límite" in result["message"].lower() or str(MAX_CONVERSATION_DEPTH) in result["message"]


def test_agent_bus_target_not_found():
    """Test that send_message handles missing target agent."""
    from app.core.agent_bus import AgentBus

    db = MagicMock()
    bus = AgentBus(db=db, organization_id=1)

    # Thread depth = 0 (not exceeded)
    db.query.return_value.filter.return_value.count.return_value = 0
    # Target agent not found
    db.query.return_value.filter.return_value.first.return_value = None

    result = bus.send_message(
        from_agent_id=1,
        to_agent_role="nonexistent_role",
        message="Test message",
    )

    assert result["status"] == "error"
    assert "nonexistent_role" in result["message"]


def test_send_agent_message_async_import():
    """Verify async dispatch function exists."""
    from app.core.agent_bus import send_agent_message_async
    assert callable(send_agent_message_async)
