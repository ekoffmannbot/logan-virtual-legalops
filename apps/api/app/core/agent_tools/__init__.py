"""
Agent Tools Registry — maps skills to tool definitions for Anthropic tool_use.

Each tool module exports a list of ToolDefinition objects.
The registry maps skill_keys → available tools for that skill.
"""

from dataclasses import dataclass, field
from typing import Any, Callable

from app.db.models import AIAgent


@dataclass
class ToolDefinition:
    name: str
    description: str
    input_schema: dict
    handler: Callable
    requires_approval: bool = False
    skill_key: str = ""


# ── Registry ──────────────────────────────────────────────────────────────────

ALL_TOOLS: list[ToolDefinition] = []

# Maps skill_key → set of tool names available for that skill
SKILL_TOOL_MAP: dict[str, set[str]] = {}


def _register_tools(tools: list[ToolDefinition]):
    """Register tool definitions into the global registry."""
    for tool in tools:
        ALL_TOOLS.append(tool)
        if tool.skill_key:
            SKILL_TOOL_MAP.setdefault(tool.skill_key, set()).add(tool.name)


def get_tools_for_agent(agent: AIAgent) -> list[dict]:
    """
    Get tool definitions available to an agent based on its enabled skills.

    Returns list of dicts with keys: name, schema, handler, requires_approval, skill_key
    """
    enabled_skills = {s.skill_key for s in agent.skills if s.is_enabled}

    # Collect tool names available for this agent's skills
    available_tool_names = set()
    for skill_key in enabled_skills:
        available_tool_names.update(SKILL_TOOL_MAP.get(skill_key, set()))

    # Also include tools with no specific skill requirement (general tools)
    general_tools = {t.name for t in ALL_TOOLS if not t.skill_key}
    available_tool_names.update(general_tools)

    result = []
    for tool in ALL_TOOLS:
        if tool.name in available_tool_names:
            result.append({
                "name": tool.name,
                "schema": {
                    "name": tool.name,
                    "description": tool.description,
                    "input_schema": tool.input_schema,
                },
                "handler": tool.handler,
                "requires_approval": tool.requires_approval,
                "skill_key": tool.skill_key,
            })
    return result


# ── Load all tool modules ─────────────────────────────────────────────────────

def _load_all():
    from app.core.agent_tools import legal, financial, communication, document
    from app.core.agent_tools import judicial, notarial, system

    _register_tools(legal.TOOLS)
    _register_tools(financial.TOOLS)
    _register_tools(communication.TOOLS)
    _register_tools(document.TOOLS)
    _register_tools(judicial.TOOLS)
    _register_tools(notarial.TOOLS)
    _register_tools(system.TOOLS)


# Auto-load on import
try:
    _load_all()
except Exception:
    pass  # Tools will be loaded later when modules are available
