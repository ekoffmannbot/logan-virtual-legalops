"""
Notary document workflow tests.
"""

import pytest


class TestNotary:
    def test_list_notary_docs(self, client, auth_headers):
        response = client.get("/api/v1/notary/", headers=auth_headers)
        assert response.status_code == 200

    def test_notary_stats(self, client, auth_headers):
        response = client.get("/api/v1/notary/stats", headers=auth_headers)
        assert response.status_code == 200

    def test_notary_doc_not_found(self, client, auth_headers):
        response = client.get("/api/v1/notary/99999", headers=auth_headers)
        assert response.status_code == 404
