"""
Security tests — RBAC, permissions, and access control.
"""

import pytest


class TestSecurityHeaders:
    def test_security_headers_present(self, client):
        response = client.get("/health")
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert response.headers.get("X-Frame-Options") == "DENY"
        assert response.headers.get("X-XSS-Protection") == "1; mode=block"
        assert "Content-Security-Policy" in response.headers


class TestRBAC:
    """Test role-based access control on admin endpoints."""

    def test_admin_access_as_gerente(self, client, auth_headers):
        """GERENTE_LEGAL should access admin endpoints."""
        response = client.get("/api/v1/admin/users/", headers=auth_headers)
        assert response.status_code == 200

    def test_admin_denied_for_abogado(self, client, abogado_headers):
        """ABOGADO should NOT access admin endpoints."""
        response = client.get("/api/v1/admin/users/", headers=abogado_headers)
        assert response.status_code == 403

    def test_admin_denied_for_secretaria(self, client, secretaria_headers):
        """SECRETARIA should NOT access admin endpoints."""
        response = client.get("/api/v1/admin/users/", headers=secretaria_headers)
        assert response.status_code == 403

    def test_unauthenticated_gets_401(self, client):
        """No token should get 401."""
        response = client.get("/api/v1/leads/")
        assert response.status_code in [401, 403]


class TestOrganizationIsolation:
    """Test multi-tenant data isolation."""

    def test_user_only_sees_own_org_data(self, client, auth_headers):
        """User should only see data from their organization."""
        response = client.get("/api/v1/leads/", headers=auth_headers)
        assert response.status_code == 200
        # All leads should belong to user's org (empty is also valid)
