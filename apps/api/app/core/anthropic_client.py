"""
Anthropic API client with tool_use support, streaming, and model fallback.

Wraps the Anthropic SDK to provide:
- Synchronous and streaming message sending with tool_use
- Automatic fallback from Opus → Sonnet on 429/overloaded
- Token/latency tracking for cost analytics
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Optional

import anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class MessageResult:
    """Result from an Anthropic API call."""
    content: str = ""
    tool_calls: list[dict] = field(default_factory=list)
    stop_reason: str = ""
    input_tokens: int = 0
    output_tokens: int = 0
    latency_ms: int = 0
    model_used: str = ""


class AnthropicClient:
    """
    Wrapper around Anthropic SDK with tool_use, streaming, and fallback.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY is required for AnthropicClient")
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self._fallback_map = {
            settings.ANTHROPIC_OPUS_MODEL: settings.ANTHROPIC_SONNET_MODEL,
        }

    def send_message(
        self,
        model: str,
        system: str,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ) -> MessageResult:
        """
        Send a message to Anthropic with optional tool_use definitions.
        Falls back to a lighter model on 429/overloaded errors.
        """
        start = time.monotonic()
        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        try:
            response = self.client.messages.create(**kwargs)
        except (anthropic.RateLimitError, anthropic.InternalServerError) as exc:
            fallback = self._fallback_map.get(model)
            if fallback:
                logger.warning(
                    "Anthropic %s failed (%s), falling back to %s",
                    model, type(exc).__name__, fallback,
                )
                kwargs["model"] = fallback
                response = self.client.messages.create(**kwargs)
            else:
                raise

        elapsed_ms = int((time.monotonic() - start) * 1000)
        return self._parse_response(response, elapsed_ms)

    def send_message_stream(
        self,
        model: str,
        system: str,
        messages: list[dict],
        tools: Optional[list[dict]] = None,
        max_tokens: int = 4096,
        temperature: float = 0.3,
    ):
        """
        Streaming version — yields partial text chunks and a final MessageResult.
        Yields tuples of (event_type, data):
          ("text", str)           — partial text delta
          ("tool_use", dict)      — complete tool call
          ("result", MessageResult) — final aggregated result
        """
        start = time.monotonic()
        kwargs: dict[str, Any] = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "system": system,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        full_text = ""
        tool_calls = []
        input_tokens = 0
        output_tokens = 0
        stop_reason = ""

        with self.client.messages.stream(**kwargs) as stream:
            for event in stream:
                if event.type == "content_block_delta":
                    if hasattr(event.delta, "text"):
                        full_text += event.delta.text
                        yield ("text", event.delta.text)
                elif event.type == "content_block_start":
                    if event.content_block.type == "tool_use":
                        tool_calls.append({
                            "id": event.content_block.id,
                            "name": event.content_block.name,
                            "input": {},
                        })
                elif event.type == "content_block_delta":
                    if hasattr(event.delta, "partial_json") and tool_calls:
                        pass  # JSON accumulates; final parse below
                elif event.type == "message_delta":
                    stop_reason = getattr(event.delta, "stop_reason", "") or ""
                    output_tokens = getattr(event.usage, "output_tokens", 0) if hasattr(event, "usage") else 0
                elif event.type == "message_start":
                    if hasattr(event.message, "usage"):
                        input_tokens = event.message.usage.input_tokens

            # Get final message for complete tool_calls
            final = stream.get_final_message()
            if final:
                tool_calls = []
                for block in final.content:
                    if block.type == "tool_use":
                        tool_calls.append({
                            "id": block.id,
                            "name": block.name,
                            "input": block.input,
                        })
                        yield ("tool_use", tool_calls[-1])
                if final.usage:
                    input_tokens = final.usage.input_tokens
                    output_tokens = final.usage.output_tokens
                stop_reason = final.stop_reason or ""

        elapsed_ms = int((time.monotonic() - start) * 1000)
        result = MessageResult(
            content=full_text,
            tool_calls=tool_calls,
            stop_reason=stop_reason,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=elapsed_ms,
            model_used=model,
        )
        yield ("result", result)

    def _parse_response(self, response, elapsed_ms: int) -> MessageResult:
        """Parse a non-streaming Anthropic response into MessageResult."""
        text_parts = []
        tool_calls = []

        for block in response.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({
                    "id": block.id,
                    "name": block.name,
                    "input": block.input,
                })

        return MessageResult(
            content="".join(text_parts),
            tool_calls=tool_calls,
            stop_reason=response.stop_reason or "",
            input_tokens=response.usage.input_tokens if response.usage else 0,
            output_tokens=response.usage.output_tokens if response.usage else 0,
            latency_ms=elapsed_ms,
            model_used=response.model,
        )


# ── Singleton ─────────────────────────────────────────────────────────────────

_client: Optional[AnthropicClient] = None


def get_anthropic_client() -> AnthropicClient:
    """Get or create the shared AnthropicClient instance."""
    global _client
    if _client is None:
        _client = AnthropicClient()
    return _client
