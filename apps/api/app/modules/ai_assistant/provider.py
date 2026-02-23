"""
AI Provider for Logan Virtual — Claude Sonnet powers everything.

Single provider, maximum power. MockAIProvider only activates
if ANTHROPIC_API_KEY is missing (graceful degradation).
"""

import logging
from typing import Protocol

logger = logging.getLogger(__name__)


class AIProvider(Protocol):
    def draft_email(self, context: str) -> dict: ...
    def draft_proposal(self, context: str) -> dict: ...
    def summarize_matter(self, context: str) -> dict: ...
    def ask(self, question: str, context: str) -> dict: ...


class MockAIProvider:
    """Fallback when no API key is configured."""

    def draft_email(self, context: str) -> dict:
        return {
            "draft": (
                "Estimado/a cliente,\n\n"
                f"En relación a su consulta sobre {context[:100]}...\n\n"
                "Quedamos atentos a sus comentarios.\n\n"
                "Saludos cordiales,\nLogan & Logan Abogados"
            ),
            "confidence": 0.5,
            "sources": [],
        }

    def draft_proposal(self, context: str) -> dict:
        return {
            "draft": (
                "PROPUESTA DE SERVICIOS JURÍDICOS\n\n"
                f"Propuesta para {context[:100]}...\n\n"
                "Honorarios: A convenir\nModalidad: Cuotas mensuales"
            ),
            "confidence": 0.5,
            "sources": [],
        }

    def summarize_matter(self, context: str) -> dict:
        return {
            "summary": f"Resumen automático del caso.\n\n{context[:200]}...\n\nRequiere revisión del abogado a cargo.",
            "confidence": 0.5,
            "sources": [],
            "next_steps": ["Revisar documentación", "Contactar al cliente"],
        }

    def ask(self, question: str, context: str) -> dict:
        return {
            "answer": (
                f"Respecto a '{question[:80]}': se recomienda consultar con el "
                "abogado a cargo para una respuesta definitiva."
            ),
            "confidence": 0.5,
            "sources": [],
        }


class ClaudeProvider:
    """
    Full-power AI provider using Anthropic Claude.
    Handles ALL tasks: chat, emails, proposals, case analysis, agent drafts.
    """

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    # ── Core call ──────────────────────────────────────────────────

    def _call(self, system: str, user_message: str, max_tokens: int = 2048) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    # ── System prompts by role ─────────────────────────────────────

    SYSTEM_GENERAL = (
        "Eres el asistente legal AI de Logan & Logan Abogados, un estudio jurídico "
        "chileno de primer nivel. Respondes siempre en español chileno formal. "
        "Eres preciso, profesional y conciso. Citas normas legales chilenas cuando "
        "es pertinente (CPC, CC, CT, Ley 19.496, etc.). No inventas información."
    )

    SYSTEM_EMAIL = (
        "Eres el redactor de emails de Logan & Logan Abogados. Redactas emails "
        "profesionales, formales y empáticos en español chileno. Formato: saludo "
        "formal, cuerpo claro con la información relevante, despedida cordial. "
        "Firma siempre como 'Logan & Logan Abogados'."
    )

    SYSTEM_PROPOSAL = (
        "Eres el especialista en propuestas comerciales de Logan & Logan Abogados. "
        "Redactas propuestas de servicios jurídicos detalladas y convincentes. "
        "Incluyes: análisis preliminar, estrategia legal propuesta con base normativa, "
        "desglose de honorarios, modalidad de pago, plazos estimados, y cláusulas "
        "de confidencialidad. Formato profesional chileno."
    )

    SYSTEM_ANALYST = (
        "Eres el analista legal senior de Logan & Logan Abogados. Realizas análisis "
        "jurídicos exhaustivos de casos. Incluyes: resumen ejecutivo, marco normativo "
        "aplicable con citas legales, estado procesal, estrategia recomendada con "
        "alternativas, riesgos y contingencias, próximos pasos concretos con plazos. "
        "Eres meticuloso y fundamentado."
    )

    SYSTEM_AGENT = (
        "Eres un asistente operativo de Logan & Logan Abogados. Generas textos "
        "breves, claros y profesionales para tareas internas: recordatorios de "
        "cobranza, seguimientos de propuestas, guiones de llamada, alertas de SLA, "
        "y resúmenes ejecutivos. Máximo 5-8 líneas. Español chileno formal."
    )

    # ── Provider methods ───────────────────────────────────────────

    def draft_email(self, context: str) -> dict:
        prompt = (
            "Redacta un email profesional de respuesta al cliente.\n\n"
            f"Contexto:\n{context}"
        )
        return {"draft": self._call(self.SYSTEM_EMAIL, prompt), "confidence": 0.92, "sources": []}

    def draft_proposal(self, context: str) -> dict:
        prompt = (
            "Redacta una propuesta de servicios jurídicos completa y profesional.\n\n"
            f"Contexto:\n{context}"
        )
        return {"draft": self._call(self.SYSTEM_PROPOSAL, prompt, max_tokens=4096), "confidence": 0.90, "sources": []}

    def summarize_matter(self, context: str) -> dict:
        prompt = (
            "Realiza un análisis legal completo de este caso.\n\n"
            f"Información del caso:\n{context}"
        )
        text = self._call(self.SYSTEM_ANALYST, prompt, max_tokens=4096)
        return {"summary": text, "confidence": 0.90, "sources": [], "next_steps": []}

    def ask(self, question: str, context: str) -> dict:
        prompt = f"Pregunta: {question}"
        if context:
            prompt = f"Contexto del caso:\n{context}\n\nPregunta: {question}"
        return {"answer": self._call(self.SYSTEM_GENERAL, prompt), "confidence": 0.90, "sources": []}

    # ── Agent-specific helpers (used by Celery tasks) ──────────────

    def agent_draft(self, prompt: str) -> str:
        """Short draft for Celery agent tasks (cobranza, SLA, notary, etc.)."""
        return self._call(self.SYSTEM_AGENT, prompt, max_tokens=512)


# ── Factory ───────────────────────────────────────────────────────────────────

_cached_provider: AIProvider | None = None


def get_ai_provider(tier: str = "default") -> AIProvider:
    """
    Returns ClaudeProvider if ANTHROPIC_API_KEY is set, MockAIProvider otherwise.
    The `tier` parameter is accepted for backward compatibility but ignored —
    Claude handles everything.
    """
    global _cached_provider

    if _cached_provider is not None:
        return _cached_provider

    from app.core.config import settings
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")

    if api_key:
        try:
            _cached_provider = ClaudeProvider(api_key)
            logger.info("AI Provider: Claude Sonnet activated")
            return _cached_provider
        except Exception as exc:
            logger.error("Failed to initialize Claude provider: %s", exc)

    logger.warning("AI Provider: using MockAIProvider (no ANTHROPIC_API_KEY)")
    _cached_provider = MockAIProvider()
    return _cached_provider
