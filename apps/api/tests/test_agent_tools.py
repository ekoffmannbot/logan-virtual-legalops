"""Tests for agent tools registry and tool definitions."""

import pytest


def test_tools_registry_loads():
    """Verify all tools load into the registry."""
    from app.core.agent_tools import ALL_TOOLS, SKILL_TOOL_MAP
    assert len(ALL_TOOLS) >= 30, f"Expected 30+ tools, got {len(ALL_TOOLS)}"
    assert len(SKILL_TOOL_MAP) >= 15, f"Expected 15+ skill mappings, got {len(SKILL_TOOL_MAP)}"


def test_tool_definitions_complete():
    """Verify each tool has required fields."""
    from app.core.agent_tools import ALL_TOOLS

    for tool in ALL_TOOLS:
        assert tool.name, f"Tool missing name: {tool}"
        assert tool.description, f"Tool {tool.name} missing description"
        assert tool.input_schema, f"Tool {tool.name} missing input_schema"
        assert callable(tool.handler), f"Tool {tool.name} handler not callable"
        assert isinstance(tool.requires_approval, bool), (
            f"Tool {tool.name} requires_approval not bool"
        )


def test_get_tools_for_agent():
    """Verify tool filtering by agent skills — returns list of dicts."""
    from app.core.agent_tools import get_tools_for_agent
    from unittest.mock import MagicMock

    # Create a mock agent with specific skills
    agent = MagicMock()
    skill1 = MagicMock()
    skill1.skill_key = "redaccion_legal"
    skill1.is_enabled = True
    skill2 = MagicMock()
    skill2.skill_key = "cobranza"
    skill2.is_enabled = True
    skill3 = MagicMock()
    skill3.skill_key = "disabled_skill"
    skill3.is_enabled = False
    agent.skills = [skill1, skill2, skill3]

    tools = get_tools_for_agent(agent)

    # get_tools_for_agent returns list of dicts with "name" key
    tool_names = {t["name"] for t in tools}

    # Should have tools from redaccion_legal and cobranza, but not disabled_skill
    assert len(tools) > 0, "Expected at least some tools for enabled skills"
    # request_agent_handoff should always be included (general tool, no skill_key)
    assert "request_agent_handoff" in tool_names


def test_skill_tool_map_keys():
    """Verify SKILL_TOOL_MAP keys match expected skills."""
    from app.core.agent_tools import SKILL_TOOL_MAP

    expected_skills = {
        "redaccion_legal", "analisis_casos", "investigacion_legal",
        "facturacion", "cobranza", "email_management", "comunicaciones",
        "gestion_documental", "tramites_notariales", "seguimiento_judicial",
        "monitoreo_sistema",
    }
    for skill in expected_skills:
        assert skill in SKILL_TOOL_MAP, f"Expected skill '{skill}' in SKILL_TOOL_MAP"


def test_tool_input_schemas_valid():
    """Verify tool input schemas have proper JSON Schema structure."""
    from app.core.agent_tools import ALL_TOOLS

    for tool in ALL_TOOLS:
        schema = tool.input_schema
        assert "type" in schema, f"Tool {tool.name} schema missing 'type'"
        assert schema["type"] == "object", f"Tool {tool.name} schema type should be 'object'"
        assert "properties" in schema, f"Tool {tool.name} schema missing 'properties'"
