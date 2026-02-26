"""
Contract lifecycle tests.
"""

import pytest


class TestContractCRUD:
    def test_list_contracts(self, client, auth_headers):
        response = client.get("/api/v1/contracts/", headers=auth_headers)
        assert response.status_code == 200

    def test_contract_stats(self, client, auth_headers):
        response = client.get("/api/v1/contracts/stats", headers=auth_headers)
        assert response.status_code == 200

    def test_contract_not_found(self, client, auth_headers):
        response = client.get("/api/v1/contracts/99999", headers=auth_headers)
        assert response.status_code == 404
