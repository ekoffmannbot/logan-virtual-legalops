"""
Reports and analytics tests.
"""

import pytest


class TestReports:
    def test_productivity_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/productivity", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["report_type"] == "productivity"

    def test_financial_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/financial", headers=auth_headers)
        assert response.status_code == 200

    def test_sla_compliance_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/sla-compliance", headers=auth_headers)
        assert response.status_code == 200

    def test_lead_conversion_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/lead-conversion", headers=auth_headers)
        assert response.status_code == 200

    def test_collections_aging_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/collections-aging", headers=auth_headers)
        assert response.status_code == 200

    def test_reports_denied_for_abogado(self, client, abogado_headers):
        """Regular abogado should not access reports."""
        response = client.get("/api/v1/reports/financial", headers=abogado_headers)
        assert response.status_code == 403
