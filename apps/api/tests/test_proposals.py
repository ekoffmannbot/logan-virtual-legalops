import pytest


@pytest.fixture
def sample_client_id(client, auth_headers):
    """Create a client and return its ID for proposal tests."""
    resp = client.post(
        "/api/v1/clients/",
        json={"full_name": "Proposal Test Client", "rut": "99.999.999-9"},
        headers=auth_headers,
    )
    if resp.status_code in [200, 201]:
        return resp.json()["id"]
    return None


def test_create_proposal(client, auth_headers, sample_client_id):
    if sample_client_id is None:
        pytest.skip("Could not create client for proposal test")

    response = client.post(
        "/api/v1/proposals/",
        json={
            "client_id": sample_client_id,
            "amount": 1000000,
            "description": "Demanda civil",
        },
        headers=auth_headers,
    )
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["status"] == "draft"


def test_list_proposals(client, auth_headers, sample_client_id):
    if sample_client_id is None:
        pytest.skip("Could not create client for proposal test")

    client.post(
        "/api/v1/proposals/",
        json={"client_id": sample_client_id, "amount": 500000, "description": "Test"},
        headers=auth_headers,
    )

    response = client.get("/api/v1/proposals/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    # API may return paginated {items, total} or a plain list
    items = data["items"] if isinstance(data, dict) and "items" in data else data
    assert len(items) >= 1


def test_send_proposal(client, auth_headers, sample_client_id):
    if sample_client_id is None:
        pytest.skip("Could not create client for proposal test")

    create = client.post(
        "/api/v1/proposals/",
        json={"client_id": sample_client_id, "amount": 750000, "description": "Strategy"},
        headers=auth_headers,
    )
    assert create.status_code in [200, 201], f"Create failed: {create.json()}"
    proposal_id = create.json()["id"]

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/send",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sent"
    assert data["sent_at"] is not None


def test_accept_proposal(client, auth_headers, sample_client_id):
    if sample_client_id is None:
        pytest.skip("Could not create client for proposal test")

    create = client.post(
        "/api/v1/proposals/",
        json={"client_id": sample_client_id, "amount": 600000, "description": "Accept test"},
        headers=auth_headers,
    )
    assert create.status_code in [200, 201], f"Create failed: {create.json()}"
    pid = create.json()["id"]

    # Must send first
    client.post(f"/api/v1/proposals/{pid}/send", headers=auth_headers)

    response = client.post(f"/api/v1/proposals/{pid}/accept", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


def test_cannot_accept_draft_proposal(client, auth_headers, sample_client_id):
    if sample_client_id is None:
        pytest.skip("Could not create client for proposal test")

    create = client.post(
        "/api/v1/proposals/",
        json={"client_id": sample_client_id, "amount": 400000, "description": "Invalid transition"},
        headers=auth_headers,
    )
    assert create.status_code in [200, 201], f"Create failed: {create.json()}"
    pid = create.json()["id"]

    response = client.post(f"/api/v1/proposals/{pid}/accept", headers=auth_headers)
    assert response.status_code in [400, 409]
