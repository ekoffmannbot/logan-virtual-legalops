"""
Client CRUD tests.
"""

import pytest


class TestClientCRUD:
    def test_create_client(self, client, auth_headers, org):
        response = client.post(
            "/api/v1/clients/",
            json={
                "full_name": "Test Client SpA",
                "rut": "12.345.678-9",
                "email": "testclient@example.cl",
                "phone": "+56912345678",
                "address": "Av. Providencia 1234, Santiago",
            },
            headers=auth_headers,
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["full_name"] == "Test Client SpA"

    def test_list_clients(self, client, auth_headers):
        response = client.get("/api/v1/clients/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_get_client_not_found(self, client, auth_headers):
        response = client.get("/api/v1/clients/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_client_360_view(self, client, auth_headers):
        # Create a client first
        create_resp = client.post(
            "/api/v1/clients/",
            json={"full_name": "360 Client", "rut": "11.111.111-1"},
            headers=auth_headers,
        )
        if create_resp.status_code in [200, 201]:
            client_id = create_resp.json()["id"]
            response = client.get(f"/api/v1/clients/{client_id}/360", headers=auth_headers)
            assert response.status_code == 200
