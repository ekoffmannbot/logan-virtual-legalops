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


def get_ai_provider() -> AIProvider:
    from app.core.config import settings
    return MockAIProvider()  # Always mock for MVP
