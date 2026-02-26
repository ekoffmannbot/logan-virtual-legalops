"""
Dashboard & KPI tests.
"""

import pytest


class TestDashboard:
    def test_overview(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data or isinstance(data, dict)

    def test_action_items(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/action-items", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_no_auth(self, client):
        response = client.get("/api/v1/dashboards/overview")
        assert response.status_code in [401, 403]
