def test_create_lead(client, auth_headers):
    response = client.post(
        "/api/v1/leads/",
        json={
            "full_name": "Test Lead",
            "source": "inbound_call",
            "phone": "+56912345678",
            "email": "test@example.com",
        },
        headers=auth_headers,
    )
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["full_name"] == "Test Lead"
    assert data["status"] == "new"


def test_list_leads(client, auth_headers):
    # Create a lead first
    client.post(
        "/api/v1/leads/",
        json={"full_name": "Lead 1", "source": "walk_in"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/leads/",
        json={"full_name": "Lead 2", "source": "referral"},
        headers=auth_headers,
    )

    response = client.get("/api/v1/leads/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2


def test_get_lead(client, auth_headers):
    create = client.post(
        "/api/v1/leads/",
        json={"full_name": "Detail Lead", "source": "inbound_call"},
        headers=auth_headers,
    )
    lead_id = create.json()["id"]

    response = client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["full_name"] == "Detail Lead"


def test_update_lead(client, auth_headers):
    create = client.post(
        "/api/v1/leads/",
        json={"full_name": "Update Lead", "source": "walk_in"},
        headers=auth_headers,
    )
    lead_id = create.json()["id"]

    response = client.patch(
        f"/api/v1/leads/{lead_id}",
        json={"phone": "+56999999999", "notes": "Updated notes"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["phone"] == "+56999999999"


def test_lead_requires_auth(client):
    response = client.get("/api/v1/leads/")
    assert response.status_code == 401
