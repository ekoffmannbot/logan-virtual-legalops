"""
Email ticket tests.
"""

import pytest


class TestEmailTickets:
    def test_list_tickets(self, client, auth_headers):
        response = client.get("/api/v1/email-tickets/", headers=auth_headers)
        assert response.status_code == 200

    def test_ticket_stats(self, client, auth_headers):
        response = client.get("/api/v1/email-tickets/stats", headers=auth_headers)
        assert response.status_code == 200

    def test_ticket_not_found(self, client, auth_headers):
        response = client.get("/api/v1/email-tickets/99999", headers=auth_headers)
        assert response.status_code == 404
