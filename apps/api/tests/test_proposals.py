def test_create_proposal(client, auth_headers):
    response = client.post(
        "/api/v1/proposals/",
        json={
            "amount": 1000000,
            "currency": "CLP",
            "payment_terms_text": "3 cuotas",
            "strategy_summary_text": "Demanda civil",
        },
        headers=auth_headers,
    )
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["status"] == "draft"
    assert data["amount"] == 1000000


def test_list_proposals(client, auth_headers):
    client.post(
        "/api/v1/proposals/",
        json={"amount": 500000, "strategy_summary_text": "Test"},
        headers=auth_headers,
    )

    response = client.get("/api/v1/proposals/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_send_proposal(client, auth_headers):
    create = client.post(
        "/api/v1/proposals/",
        json={"amount": 750000, "strategy_summary_text": "Strategy"},
        headers=auth_headers,
    )
    proposal_id = create.json()["id"]

    response = client.post(
        f"/api/v1/proposals/{proposal_id}/send",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sent"
    assert data["sent_at"] is not None


def test_accept_proposal(client, auth_headers):
    create = client.post(
        "/api/v1/proposals/",
        json={"amount": 600000, "strategy_summary_text": "Accept test"},
        headers=auth_headers,
    )
    pid = create.json()["id"]

    # Must send first
    client.post(f"/api/v1/proposals/{pid}/send", headers=auth_headers)

    response = client.post(f"/api/v1/proposals/{pid}/accept", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["status"] == "accepted"


def test_cannot_accept_draft_proposal(client, auth_headers):
    create = client.post(
        "/api/v1/proposals/",
        json={"amount": 400000, "strategy_summary_text": "Invalid transition"},
        headers=auth_headers,
    )
    pid = create.json()["id"]

    response = client.post(f"/api/v1/proposals/{pid}/accept", headers=auth_headers)
    assert response.status_code in [400, 409]
