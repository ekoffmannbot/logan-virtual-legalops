"""
Global search tests.
"""

import pytest


class TestGlobalSearch:
    def test_search_basic(self, client, auth_headers):
        response = client.get("/api/v1/search/?q=test", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total" in data

    def test_search_by_type(self, client, auth_headers):
        response = client.get("/api/v1/search/?q=test&type=clients", headers=auth_headers)
        assert response.status_code == 200

    def test_search_too_short(self, client, auth_headers):
        response = client.get("/api/v1/search/?q=a", headers=auth_headers)
        assert response.status_code == 422  # min_length=2

    def test_search_no_auth(self, client):
        response = client.get("/api/v1/search/?q=test")
        assert response.status_code in [401, 403]
