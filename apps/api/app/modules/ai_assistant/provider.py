from typing import Protocol


class AIProvider(Protocol):
    def draft_email(self, context: str) -> dict: ...
    def draft_proposal(self, context: str) -> dict: ...
    def summarize_matter(self, context: str) -> dict: ...
    def ask(self, question: str, context: str) -> dict: ...


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


class AnthropicProvider:
    """AI provider using Anthropic Claude API."""

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

    def _call(self, user_message: str) -> str:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
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


def get_ai_provider() -> AIProvider:
    from app.core.config import settings
    if getattr(settings, 'AI_PROVIDER', 'mock') == "anthropic":
        api_key = getattr(settings, 'ANTHROPIC_API_KEY', '')
        if api_key:
            return AnthropicProvider(api_key)
    return MockAIProvider()
