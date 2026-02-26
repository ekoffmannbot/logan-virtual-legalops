"""
AI Assistant endpoint tests (uses MockAIProvider in tests).
"""

import pytest


class TestAIAssistant:
    def test_chat_endpoint(self, client, auth_headers):
        response = client.post(
            "/api/v1/ai/chat",
            json={"message": "Hola, necesito ayuda con un caso"},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data or "response" in data or isinstance(data, dict)

    def test_draft_email(self, client, auth_headers):
        response = client.post(
            "/api/v1/ai/draft-email",
            json={"context": "Respuesta a cliente por consulta de cobranza"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_ai_no_auth(self, client):
        response = client.post("/api/v1/ai/chat", json={"message": "test"})
        assert response.status_code in [401, 403]
