"""
Agent Runtime — the core execution engine for AI agents.

Orchestrates the full agent execution loop:
1. Load agent config (model, system_prompt, temperature)
2. Load conversation history for thread
3. Filter tools by agent's enabled skills
4. Send to Anthropic with tool_use
5. Execute tool calls, loop until text response
6. Persist conversation in ai_agent_conversations
7. Create/update ai_agent_task
8. Escalate when needed (non-autonomous skills, errors, external actions)
"""

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.core.anthropic_client import AnthropicClient, MessageResult, get_anthropic_client
from app.core.config import settings
from app.core.escalation import EscalationManager, ALWAYS_ESCALATE_ACTIONS
from app.db.enums import AgentTaskStatusEnum, AgentTaskTriggerEnum, AgentMessageRoleEnum
from app.db.models import AIAgent, AIAgentConversation, AIAgentTask

logger = logging.getLogger(__name__)


class AgentRuntime:
    """
    Core execution engine for AI agents.

    Usage:
        runtime = AgentRuntime(db, organization_id)
        result = runtime.execute(agent, task_input, thread_id)
    """

    def __init__(
        self,
        db: Session,
        organization_id: int,
        client: Optional[AnthropicClient] = None,
    ):
        self.db = db
        self.organization_id = organization_id
        self.client = client or get_anthropic_client()
        self.escalation = EscalationManager(db, organization_id)

    def execute(
        self,
        agent: AIAgent,
        task_input: dict,
        thread_id: Optional[str] = None,
        trigger_type: str = "manual",
        max_iterations: Optional[int] = None,
        from_user_id: Optional[int] = None,
        from_agent_id: Optional[int] = None,
    ) -> dict:
        """
        Execute an agent with the given input.

        Args:
            agent: The AIAgent to execute
            task_input: Dict with at least {"message": str} and optional context
            thread_id: Conversation thread ID (created if not provided)
            trigger_type: How this execution was triggered
            max_iterations: Max tool-use loops (default from settings)
            from_user_id: If triggered by a human user
            from_agent_id: If triggered by another agent

        Returns:
            Dict with keys: response, thread_id, task_id, status, tokens, latency_ms
        """
        if not agent.is_active:
            return {
                "response": f"Agente '{agent.display_name}' está desactivado.",
                "status": "error",
                "thread_id": thread_id or str(uuid.uuid4()),
            }

        thread_id = thread_id or str(uuid.uuid4())
        max_iter = max_iterations or settings.AGENT_MAX_TOOL_ITERATIONS
        user_message = task_input.get("message", "")
        context = task_input.get("context", {})

        # Create task record
        task = AIAgentTask(
            organization_id=self.organization_id,
            agent_id=agent.id,
            task_type=task_input.get("task_type", "chat"),
            trigger_type=trigger_type,
            status=AgentTaskStatusEnum.RUNNING.value,
            input_data=task_input,
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(task)
        self.db.flush()

        timeout_at = time.monotonic() + settings.AGENT_RUNTIME_TIMEOUT

        try:
            result = self._run_loop(
                agent=agent,
                user_message=user_message,
                context=context,
                thread_id=thread_id,
                task=task,
                max_iterations=max_iter,
                from_user_id=from_user_id,
                from_agent_id=from_agent_id,
                timeout_at=timeout_at,
            )

            # Mark task completed
            task.status = AgentTaskStatusEnum.COMPLETED.value
            task.output_data = {
                "response": result["response"],
                "tokens": result.get("tokens", {}),
            }
            task.completed_at = datetime.now(timezone.utc)
            self.escalation.clear_errors(agent.id)
            self.db.commit()

            return {
                "response": result["response"],
                "thread_id": thread_id,
                "task_id": task.id,
                "status": "completed",
                "tokens": result.get("tokens", {}),
                "latency_ms": result.get("latency_ms", 0),
            }

        except EscalationRequired as exc:
            task.status = AgentTaskStatusEnum.ESCALATED.value
            task.escalation_reason = str(exc)
            notification_id = self.escalation.escalate(
                agent=agent,
                reason=str(exc),
                task_id=task.id,
                context={"input": task_input, "thread_id": thread_id},
            )
            self.db.commit()
            return {
                "response": f"Acción escalada al Gerente Legal: {exc}",
                "thread_id": thread_id,
                "task_id": task.id,
                "status": "escalated",
                "notification_id": notification_id,
            }

        except Exception as exc:
            error_count = self.escalation.record_error(agent.id)
            task.status = AgentTaskStatusEnum.FAILED.value
            task.error_message = str(exc)[:2000]
            task.completed_at = datetime.now(timezone.utc)

            # Auto-escalate on repeated failures
            should_esc, reason = self.escalation.should_escalate(
                agent, error_count=error_count,
            )
            if should_esc:
                task.status = AgentTaskStatusEnum.ESCALATED.value
                task.escalation_reason = reason
                self.escalation.escalate(
                    agent=agent,
                    reason=reason,
                    task_id=task.id,
                    context={"error": str(exc), "input": task_input},
                )

            self.db.commit()
            logger.exception("Agent %s execution failed", agent.display_name)
            return {
                "response": f"Error en agente '{agent.display_name}': {exc}",
                "thread_id": thread_id,
                "task_id": task.id,
                "status": "failed",
                "error": str(exc),
            }

    def _run_loop(
        self,
        agent: AIAgent,
        user_message: str,
        context: dict,
        thread_id: str,
        task: AIAgentTask,
        max_iterations: int,
        from_user_id: Optional[int],
        from_agent_id: Optional[int],
        timeout_at: float = 0,
    ) -> dict:
        """
        The core tool-use loop.

        Sends messages to Anthropic, executes tool calls, and loops
        until the agent produces a text response or hits max iterations.
        """
        # Build system prompt with context
        system_prompt = agent.system_prompt
        if context:
            context_str = "\n".join(f"- {k}: {v}" for k, v in context.items())
            system_prompt += f"\n\nContexto actual:\n{context_str}"

        # Load conversation history
        history = self._load_history(thread_id)

        # Add user message
        history.append({"role": "user", "content": user_message})

        # Persist user message
        self._persist_message(
            thread_id=thread_id,
            role=AgentMessageRoleEnum.USER.value,
            content=user_message,
            from_user_id=from_user_id,
            from_agent_id=from_agent_id,
            to_agent_id=agent.id,
        )

        # Get available tools for this agent
        tools = self._get_agent_tools(agent)
        tools_schema = [t["schema"] for t in tools] if tools else None

        total_input_tokens = 0
        total_output_tokens = 0
        total_latency = 0

        for iteration in range(max_iterations):
            # Check runtime timeout
            if timeout_at and time.monotonic() > timeout_at:
                logger.warning("Agent %s timed out after %ds", agent.display_name, settings.AGENT_RUNTIME_TIMEOUT)
                return {
                    "response": "El agente alcanzó el tiempo límite de ejecución. Intente con una consulta más específica.",
                    "tokens": {"input": total_input_tokens, "output": total_output_tokens},
                    "latency_ms": total_latency,
                }

            # Trim history if token estimate is too high (rough estimate: 4 chars ≈ 1 token)
            self._trim_history_if_needed(history, max_context_tokens=80000)

            # Call Anthropic
            try:
                result: MessageResult = self.client.send_message(
                    model=agent.model_name,
                    system=system_prompt,
                    messages=history,
                    tools=tools_schema,
                    max_tokens=agent.max_tokens,
                    temperature=agent.temperature,
                )
            except Exception as api_exc:
                raise self._categorize_api_error(api_exc) from api_exc

            total_input_tokens += result.input_tokens
            total_output_tokens += result.output_tokens
            total_latency += result.latency_ms

            # No tool calls — we have our final response
            if not result.tool_calls:
                # Persist assistant message
                self._persist_message(
                    thread_id=thread_id,
                    role=AgentMessageRoleEnum.ASSISTANT.value,
                    content=result.content,
                    from_agent_id=agent.id,
                    model_used=result.model_used,
                    input_tokens=result.input_tokens,
                    output_tokens=result.output_tokens,
                    latency_ms=result.latency_ms,
                )
                return {
                    "response": result.content,
                    "tokens": {
                        "input": total_input_tokens,
                        "output": total_output_tokens,
                    },
                    "latency_ms": total_latency,
                }

            # Build assistant message with content blocks
            assistant_content = []
            if result.content:
                assistant_content.append({"type": "text", "text": result.content})
            for tc in result.tool_calls:
                assistant_content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["input"],
                })
            history.append({"role": "assistant", "content": assistant_content})

            # Persist assistant message with tool calls
            self._persist_message(
                thread_id=thread_id,
                role=AgentMessageRoleEnum.ASSISTANT.value,
                content=result.content or f"[Tool calls: {', '.join(tc['name'] for tc in result.tool_calls)}]",
                from_agent_id=agent.id,
                tool_calls=result.tool_calls,
                model_used=result.model_used,
                input_tokens=result.input_tokens,
                output_tokens=result.output_tokens,
                latency_ms=result.latency_ms,
            )

            # Execute each tool call
            tool_results = []
            for tc in result.tool_calls:
                tool_result = self._execute_tool(
                    agent=agent,
                    tool_name=tc["name"],
                    tool_input=tc["input"],
                    tools=tools,
                )
                tool_result_str = self._validate_tool_result(tool_result)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": tool_result_str,
                })

                # Persist tool result
                self._persist_message(
                    thread_id=thread_id,
                    role=AgentMessageRoleEnum.TOOL.value,
                    content=tool_result_str[:4000],
                    tool_calls=[{"tool_use_id": tc["id"], "name": tc["name"], "result": tool_result}],
                )

            history.append({"role": "user", "content": tool_results})

        # Max iterations reached
        return {
            "response": result.content or "Se alcanzó el límite de iteraciones del agente.",
            "tokens": {"input": total_input_tokens, "output": total_output_tokens},
            "latency_ms": total_latency,
        }

    def _load_history(self, thread_id: str) -> list[dict]:
        """Load conversation history from DB for a thread."""
        messages = (
            self.db.query(AIAgentConversation)
            .filter(
                AIAgentConversation.thread_id == thread_id,
                AIAgentConversation.organization_id == self.organization_id,
            )
            .order_by(AIAgentConversation.created_at)
            .limit(50)  # Keep context manageable
            .all()
        )

        history = []
        for msg in messages:
            if msg.message_role == AgentMessageRoleEnum.SYSTEM.value:
                continue  # System prompts are sent separately
            if msg.message_role == AgentMessageRoleEnum.TOOL.value:
                continue  # Tool results are embedded in user messages
            history.append({
                "role": msg.message_role,
                "content": msg.content,
            })
        return history

    def _persist_message(
        self,
        thread_id: str,
        role: str,
        content: str,
        from_user_id: Optional[int] = None,
        from_agent_id: Optional[int] = None,
        to_agent_id: Optional[int] = None,
        tool_calls: Optional[list] = None,
        model_used: Optional[str] = None,
        input_tokens: Optional[int] = None,
        output_tokens: Optional[int] = None,
        latency_ms: Optional[int] = None,
    ):
        """Persist a conversation message to DB."""
        msg = AIAgentConversation(
            organization_id=self.organization_id,
            from_agent_id=from_agent_id,
            to_agent_id=to_agent_id,
            from_user_id=from_user_id,
            thread_id=thread_id,
            message_role=role,
            content=content[:10000],  # Truncate very long content
            tool_calls=tool_calls,
            model_used=model_used,
            token_count_input=input_tokens,
            token_count_output=output_tokens,
            latency_ms=latency_ms,
        )
        self.db.add(msg)
        self.db.flush()

    def _get_agent_tools(self, agent: AIAgent) -> list[dict]:
        """
        Get the tool definitions available to this agent based on enabled skills.

        Returns list of dicts with keys: name, schema, handler, requires_approval, skill_key
        """
        try:
            from app.core.agent_tools import get_tools_for_agent
            return get_tools_for_agent(agent)
        except ImportError:
            logger.debug("Agent tools module not yet available")
            return []

    def _execute_tool(
        self,
        agent: AIAgent,
        tool_name: str,
        tool_input: dict,
        tools: list[dict],
    ) -> Any:
        """
        Execute a tool call, checking escalation rules first.
        """
        # Check if this tool requires escalation
        should_esc, reason = self.escalation.should_escalate(
            agent, tool_name=tool_name,
        )
        if should_esc:
            raise EscalationRequired(reason)

        # Find the tool handler
        for tool in tools:
            if tool["schema"]["name"] == tool_name:
                handler = tool["handler"]
                try:
                    return handler(
                        db=self.db,
                        params=tool_input,
                        org_id=self.organization_id,
                    )
                except Exception as exc:
                    logger.error(
                        "Tool %s failed for agent %s: %s",
                        tool_name, agent.display_name, exc,
                    )
                    return {"error": str(exc)}

        return {"error": f"Tool '{tool_name}' not found"}

    def _validate_tool_result(self, result: Any) -> str:
        """Validate and truncate tool results to prevent token overflow."""
        if result is None:
            return '{"status": "ok"}'
        result_str = str(result)
        max_chars = settings.AGENT_MAX_TOOL_RESULT_CHARS
        if len(result_str) > max_chars:
            return result_str[:max_chars] + "... [truncado]"
        return result_str

    def _trim_history_if_needed(self, history: list[dict], max_context_tokens: int = 80000) -> None:
        """Trim old messages if estimated token count exceeds threshold.

        Keeps the first message (user's original) and the last 10 messages.
        """
        estimated_tokens = sum(
            len(json.dumps(msg, default=str)) // 4 for msg in history
        )
        if estimated_tokens <= max_context_tokens or len(history) <= 12:
            return
        # Keep first message + last 10
        trimmed = [history[0]] + history[-10:]
        history.clear()
        history.extend(trimmed)
        logger.info("Trimmed conversation history from %d estimated tokens", estimated_tokens)

    @staticmethod
    def _categorize_api_error(exc: Exception) -> Exception:
        """Translate Anthropic API errors into user-friendly messages."""
        exc_type = type(exc).__name__
        exc_msg = str(exc)
        if "AuthenticationError" in exc_type or "authentication" in exc_msg.lower():
            return RuntimeError("Error de configuración: clave API inválida. Contacte al administrador.")
        if "RateLimitError" in exc_type or "rate_limit" in exc_msg.lower() or "429" in exc_msg:
            return RuntimeError("Servicio de IA saturado. Intente de nuevo en unos minutos.")
        if "APIConnectionError" in exc_type or "connection" in exc_msg.lower():
            return RuntimeError("Sin conexión al servicio de IA. Verifique la conectividad.")
        if "timeout" in exc_msg.lower():
            return RuntimeError("El servicio de IA no respondió a tiempo. Intente de nuevo.")
        return RuntimeError(f"Error interno del servicio de IA: {exc_msg[:200]}")


class EscalationRequired(Exception):
    """Raised when an agent action requires human approval."""
    pass
