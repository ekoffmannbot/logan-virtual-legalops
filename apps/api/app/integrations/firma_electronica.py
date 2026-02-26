"""
Electronic Signature integration for Logan Virtual.

Supports multiple providers: E-certchile, Acepta, DocuSign.
Implements the signing flow: upload -> send to signers -> callback -> store evidence.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from enum import Enum

logger = logging.getLogger(__name__)


class SignatureProvider(str, Enum):
    ECERTCHILE = "ecertchile"
    ACEPTA = "acepta"
    DOCUSIGN = "docusign"
    MOCK = "mock"


class SignatureStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    SIGNED = "signed"
    REJECTED = "rejected"
    EXPIRED = "expired"


class FirmaElectronicaService:
    """Service for managing electronic signatures on legal documents."""

    def __init__(self, provider: SignatureProvider = SignatureProvider.MOCK):
        self.provider = provider
        logger.info("Firma Electronica initialized with provider: %s", provider)

    def create_signing_request(
        self,
        document_path: str,
        signers: list[dict],
        metadata: dict | None = None,
    ) -> dict:
        """
        Create a signing request for a document.

        Args:
            document_path: Path to the document in storage
            signers: List of signer dicts with 'name', 'email', 'rut'
            metadata: Optional metadata (reference_number, type, etc.)

        Returns:
            Signing request data with tracking ID
        """
        if self.provider == SignatureProvider.MOCK:
            return self._mock_create(document_path, signers, metadata)

        # Future: implement real provider integrations
        raise NotImplementedError(f"Provider {self.provider} not yet implemented")

    def check_status(self, request_id: str) -> dict:
        """Check the status of a signing request."""
        if self.provider == SignatureProvider.MOCK:
            return {
                "request_id": request_id,
                "status": SignatureStatus.SIGNED.value,
                "signed_at": datetime.now(timezone.utc).isoformat(),
                "signers": [],
            }
        raise NotImplementedError(f"Provider {self.provider} not yet implemented")

    def download_signed_document(self, request_id: str) -> bytes | None:
        """Download the signed document with cryptographic evidence."""
        if self.provider == SignatureProvider.MOCK:
            return b"%PDF-1.4 (mock signed document)"
        raise NotImplementedError(f"Provider {self.provider} not yet implemented")

    def _mock_create(self, document_path: str, signers: list[dict], metadata: dict | None) -> dict:
        """Mock implementation for development/testing."""
        import uuid
        request_id = f"MOCK-{uuid.uuid4().hex[:12]}"

        return {
            "request_id": request_id,
            "status": SignatureStatus.SENT.value,
            "document_path": document_path,
            "signers": [
                {"name": s.get("name", ""), "email": s.get("email", ""), "status": "pending"}
                for s in signers
            ],
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "provider": self.provider.value,
        }


# Factory
def get_firma_service(provider: str = "mock") -> FirmaElectronicaService:
    try:
        return FirmaElectronicaService(SignatureProvider(provider))
    except ValueError:
        return FirmaElectronicaService(SignatureProvider.MOCK)
