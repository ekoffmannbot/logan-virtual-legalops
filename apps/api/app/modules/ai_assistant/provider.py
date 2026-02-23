"""
Multi-provider AI system for Logan Virtual.

Tier strategy:
  - Claude Sonnet 4.6 (Anthropic): Default provider - chat, emails, proposals, summaries
  - GPT o3 (OpenAI): Complex tasks - deep legal analysis, case strategy
  - Kimi (Moonshot): Lightweight agent tasks - reminders, scripts, short drafts
  - Mock: Graceful fallback when no API keys are configured
"""

import logging
from typing import Protocol

logger = logging.getLogger(__name__)

# ── Protocol ──────────────────────────────────────────────────────────────────

class AIProvider(Protocol):
    def draft_email(self, context: str) -> dict: ...
    def draft_proposal(self, context: str) -> dict: ...
    def summarize_matter(self, context: str) -> dict: ...
    def ask(self, question: str, context: str) -> dict: ...


# ── Mock Provider ─────────────────────────────────────────────────────────────

class MockAIProvider:
    def draft_email(self, context: str) -> dict:
        return {
            "draft": f"Estimado/a cliente,\n\nEn relación a su consulta sobre {context[:100]}...\n\nQuedamos atentos a sus comentarios.\n\nSaludos cordiales,\nLogan & Logan Abogados",
            "confidence": 0.85,
            "sources": []
        }

    def draft_proposal(self, context: str) -> dict:
        return {
            "draft": f"PROPUESTA DE SERVICIOS JURÍDICOS\n\nEstimado/a cliente,\n\nDe acuerdo a la entrevista realizada, le presentamos nuestra propuesta para {context[:100]}...\n\nHonorarios: A convenir\nModalidad de pago: Cuotas mensuales\n\nQuedamos a su disposición.",
            "confidence": 0.80,
            "sources": []
        }

    def summarize_matter(self, context: str) -> dict:
        return {
            "summary": f"RESUMEN DEL CASO\n\nEl caso presenta las siguientes características principales basado en la información proporcionada:\n\n1. Contexto: {context[:200]}...\n2. Estado actual: En proceso\n3. Próximos pasos sugeridos: Revisar documentación pendiente\n\nNota: Este resumen fue generado automáticamente y debe ser validado por el abogado a cargo.",
            "confidence": 0.75,
            "sources": [],
            "next_steps": ["Revisar documentación", "Contactar al cliente", "Actualizar plazos"]
        }

    def ask(self, question: str, context: str) -> dict:
        return {
            "answer": f"Basado en la documentación del caso, respecto a su pregunta '{question[:100]}': La información disponible sugiere que se debe revisar la documentación pertinente. Se recomienda consultar con el abogado a cargo para una respuesta definitiva.",
            "confidence": 0.70,
            "sources": [{"document_id": None, "chunk": "Información del caso"}]
        }


# ── Anthropic Provider (Claude Sonnet 4.6) ────────────────────────────────────

class AnthropicProvider:
    """Primary AI provider using Anthropic Claude for general tasks."""

    def __init__(self, api_key: str, model: str = "claude-sonnet-4-20250514"):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def _system_prompt(self) -> str:
        return (
            "Eres un asistente legal AI para Logan & Logan Abogados, "
            "un estudio jurídico chileno. Responde siempre en español chileno formal. "
            "Sé preciso, profesional y conciso. Cuando redactes documentos legales, "
            "usa formato formal chileno. No inventes información que no esté en el contexto."
        )

    def _call(self, user_message: str, max_tokens: int = 2048) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            system=self._system_prompt(),
            messages=[{"role": "user", "content": user_message}],
        )
        return response.content[0].text

    def draft_email(self, context: str) -> dict:
        prompt = (
            "Redacta un email profesional de respuesta al cliente basado en este contexto. "
            "Usa formato formal chileno con saludo, cuerpo y despedida.\n\n"
            f"Contexto:\n{context}"
        )
        return {"draft": self._call(prompt), "confidence": 0.9, "sources": []}

    def draft_proposal(self, context: str) -> dict:
        prompt = (
            "Redacta una propuesta de servicios jurídicos profesional basada en este contexto. "
            "Incluye: estrategia propuesta, honorarios sugeridos, modalidad de pago, "
            "y plazos estimados.\n\n"
            f"Contexto:\n{context}"
        )
        return {"draft": self._call(prompt), "confidence": 0.85, "sources": []}

    def summarize_matter(self, context: str) -> dict:
        prompt = (
            "Resume este caso legal de forma clara y estructurada. Incluye: "
            "1) Resumen general, 2) Estado actual, 3) Próximos pasos sugeridos, "
            "4) Riesgos identificados.\n\n"
            f"Información del caso:\n{context}"
        )
        text = self._call(prompt)
        return {
            "summary": text,
            "confidence": 0.85,
            "sources": [],
            "next_steps": [],
        }

    def ask(self, question: str, context: str) -> dict:
        prompt = f"Pregunta: {question}"
        if context:
            prompt = f"Contexto del caso:\n{context}\n\nPregunta: {question}"
        return {
            "answer": self._call(prompt),
            "confidence": 0.85,
            "sources": [],
        }


# ── OpenAI Provider (GPT o3 / 5.2 Pro) ───────────────────────────────────────

class OpenAIProvider:
    """Heavy-duty AI provider for complex legal analysis using GPT."""

    def __init__(self, api_key: str, model: str = "gpt-4o"):
        from openai import OpenAI
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def _system_prompt(self) -> str:
        return (
            "Eres un abogado senior AI experto en derecho chileno, trabajando para "
            "Logan & Logan Abogados. Tu especialidad es análisis legal profundo, "
            "estrategia de litigación y opiniones legales complejas. "
            "Responde siempre en español chileno formal y profesional. "
            "Cita normas legales chilenas cuando sea pertinente (CPC, CC, CT, etc.)."
        )

    def _call(self, user_message: str, max_tokens: int = 4096) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": self._system_prompt()},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content

    def draft_email(self, context: str) -> dict:
        prompt = (
            "Redacta un email profesional de respuesta al cliente basado en este contexto. "
            "Usa formato formal chileno con saludo, cuerpo y despedida.\n\n"
            f"Contexto:\n{context}"
        )
        return {"draft": self._call(prompt), "confidence": 0.92, "sources": []}

    def draft_proposal(self, context: str) -> dict:
        prompt = (
            "Redacta una propuesta de servicios jurídicos detallada y profesional. "
            "Incluye: análisis preliminar del caso, estrategia propuesta con base legal, "
            "honorarios sugeridos con desglose, modalidad de pago, plazos estimados, "
            "y riesgos identificados.\n\n"
            f"Contexto:\n{context}"
        )
        return {"draft": self._call(prompt, max_tokens=6000), "confidence": 0.90, "sources": []}

    def summarize_matter(self, context: str) -> dict:
        prompt = (
            "Realiza un análisis legal exhaustivo de este caso. Incluye: "
            "1) Resumen ejecutivo, 2) Análisis jurídico con normas aplicables, "
            "3) Estado procesal actual, 4) Estrategia recomendada con alternativas, "
            "5) Riesgos y contingencias, 6) Próximos pasos concretos con plazos.\n\n"
            f"Información del caso:\n{context}"
        )
        text = self._call(prompt, max_tokens=6000)
        return {
            "summary": text,
            "confidence": 0.90,
            "sources": [],
            "next_steps": [],
        }

    def ask(self, question: str, context: str) -> dict:
        prompt = f"Pregunta legal: {question}"
        if context:
            prompt = (
                f"Contexto del caso:\n{context}\n\n"
                f"Pregunta legal (responde con análisis profundo y citas legales):\n{question}"
            )
        return {
            "answer": self._call(prompt),
            "confidence": 0.90,
            "sources": [],
        }


# ── Kimi Provider (Moonshot - lightweight agent tasks) ────────────────────────

class KimiProvider:
    """Lightweight AI provider for simple agent tasks using Kimi/Moonshot API."""

    def __init__(self, api_key: str, model: str = "moonshot-v1-8k"):
        from openai import OpenAI
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.moonshot.cn/v1",
        )
        self.model = model

    def _system_prompt(self) -> str:
        return (
            "Eres un asistente de oficina para un estudio jurídico chileno. "
            "Genera textos breves, claros y profesionales en español. "
            "Sé conciso: máximo 5 líneas por respuesta."
        )

    def _call(self, user_message: str, max_tokens: int = 512) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": self._system_prompt()},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content

    def draft_email(self, context: str) -> dict:
        prompt = f"Redacta un email breve y profesional de respuesta. Contexto: {context[:500]}"
        return {"draft": self._call(prompt), "confidence": 0.75, "sources": []}

    def draft_proposal(self, context: str) -> dict:
        prompt = f"Redacta una propuesta breve de servicios jurídicos. Contexto: {context[:500]}"
        return {"draft": self._call(prompt), "confidence": 0.70, "sources": []}

    def summarize_matter(self, context: str) -> dict:
        prompt = f"Resume brevemente este caso legal en 5 líneas: {context[:500]}"
        return {"summary": self._call(prompt), "confidence": 0.70, "sources": [], "next_steps": []}

    def ask(self, question: str, context: str) -> dict:
        prompt = f"Pregunta: {question}"
        if context:
            prompt = f"Contexto: {context[:500]}\n\nPregunta: {question}"
        return {"answer": self._call(prompt), "confidence": 0.70, "sources": []}


# ── Provider Factory ──────────────────────────────────────────────────────────

def get_ai_provider(tier: str = "default") -> AIProvider:
    """
    Get AI provider by tier:
      - "default" / "standard": Claude Sonnet 4.6 (general purpose)
      - "heavy" / "complex":    GPT o3 (complex legal analysis)
      - "light" / "agent":      Kimi (simple agent tasks)

    Falls back through the chain: requested → Claude → Kimi → Mock
    """
    from app.core.config import settings

    anthropic_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    openai_key = getattr(settings, "OPENAI_API_KEY", "")
    kimi_key = getattr(settings, "KIMI_API_KEY", "")

    # ── Heavy tier: GPT for complex analysis ──
    if tier in ("heavy", "complex"):
        if openai_key:
            try:
                return OpenAIProvider(openai_key)
            except Exception as exc:
                logger.warning("OpenAI provider failed, falling back: %s", exc)
        # Fallback to Claude for heavy tasks
        if anthropic_key:
            try:
                return AnthropicProvider(anthropic_key)
            except Exception as exc:
                logger.warning("Anthropic fallback failed: %s", exc)
        return MockAIProvider()

    # ── Light tier: Claude for agent tasks (fast + reliable) ──
    # Kimi/Moonshot API is unreachable from most networks, so Claude is primary
    if tier in ("light", "agent"):
        if anthropic_key:
            try:
                return AnthropicProvider(anthropic_key)
            except Exception as exc:
                logger.warning("Anthropic provider failed for light tier: %s", exc)
        if kimi_key:
            try:
                return KimiProvider(kimi_key)
            except Exception as exc:
                logger.warning("Kimi fallback failed: %s", exc)
        return MockAIProvider()

    # ── Default tier: Claude Sonnet 4.6 ──
    if anthropic_key:
        try:
            return AnthropicProvider(anthropic_key)
        except Exception as exc:
            logger.warning("Anthropic provider failed, falling back: %s", exc)

    # Final fallback: Kimi → Mock
    if kimi_key:
        try:
            return KimiProvider(kimi_key)
        except Exception as exc:
            logger.warning("Kimi fallback failed: %s", exc)

    return MockAIProvider()
