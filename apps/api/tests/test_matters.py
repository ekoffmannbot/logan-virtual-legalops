"""
Matter (case) management tests.
"""

import pytest


class TestMatterCRUD:
    def _create_client(self, http_client, headers):
        resp = http_client.post(
            "/api/v1/clients/",
            json={"name": "Matter Test Client", "rut": "22.222.222-2"},
            headers=headers,
        )
        if resp.status_code in [200, 201]:
            return resp.json()["id"]
        return None

    def test_create_matter(self, client, auth_headers, org):
        client_id = self._create_client(client, auth_headers)
        if client_id:
            response = client.post(
                "/api/v1/matters/",
                json={
                    "title": "Caso Civil Test",
                    "client_id": client_id,
                    "matter_type": "civil",
                    "description": "Test case for civil matter",
                },
                headers=auth_headers,
            )
            assert response.status_code in [200, 201]

    def test_list_matters(self, client, auth_headers):
        response = client.get("/api/v1/matters/", headers=auth_headers)
        assert response.status_code == 200

    def test_matter_not_found(self, client, auth_headers):
        response = client.get("/api/v1/matters/99999", headers=auth_headers)
        assert response.status_code == 404
