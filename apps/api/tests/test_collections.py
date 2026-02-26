"""
Collections (invoicing) tests.
"""

import pytest


class TestCollections:
    def test_list_invoices(self, client, auth_headers):
        response = client.get("/api/v1/collections/invoices", headers=auth_headers)
        assert response.status_code == 200

    def test_collection_stats(self, client, auth_headers):
        response = client.get("/api/v1/collections/stats", headers=auth_headers)
        assert response.status_code == 200

    def test_list_cases(self, client, auth_headers):
        response = client.get("/api/v1/collections/cases", headers=auth_headers)
        assert response.status_code == 200
