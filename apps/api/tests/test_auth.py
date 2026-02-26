"""
Authentication tests — login, refresh, JWT security, rate limiting.
"""

import pytest


class TestHealthCheck:
    def test_health_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestLogin:
    def test_login_success(self, client, admin_user):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "admin@test.cl", "password": "testpass"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, admin_user):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "admin@test.cl", "password": "wrongpass"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "nobody@test.cl", "password": "testpass"},
        )
        assert response.status_code == 401

    def test_login_empty_fields(self, client):
        response = client.post("/api/v1/auth/login", data={"username": "", "password": ""})
        assert response.status_code in [401, 422]


class TestTokenRefresh:
    def test_refresh_valid(self, client, admin_user):
        # Login first
        login_resp = client.post(
            "/api/v1/auth/login",
            data={"username": "admin@test.cl", "password": "testpass"},
        )
        refresh_token = login_resp.json()["refresh_token"]

        # Refresh
        refresh_resp = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )
        assert refresh_resp.status_code == 200
        assert "access_token" in refresh_resp.json()

    def test_refresh_invalid_token(self, client):
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-token"},
        )
        assert response.status_code == 401


class TestAuthMe:
    def test_me_authenticated(self, client, auth_headers, admin_user):
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "admin@test.cl"
        assert data["role"] == "gerente_legal"

    def test_me_no_token(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code in [401, 403]

    def test_me_invalid_token(self, client):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer fake-token"},
        )
        assert response.status_code == 401
