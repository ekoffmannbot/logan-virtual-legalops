from typing import Optional, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.collections import service
from app.modules.collections.schemas import (
    InvoiceResponse,
    InvoiceDetailResponse,
    PaymentCreate,
    PaymentResponse,
    CollectionCaseResponse,
    CollectionCaseDetailResponse,
    CollectionStatsResponse,
    TimelineEventResponse,
    InvoiceTransitionRequest,
)

router = APIRouter()


# ── Stats ───────────────────────────────────────────────────────────────────

@router.get("/stats", response_model=CollectionStatsResponse)
def get_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_stats(db, current_user.organization_id)


# ── Invoices ────────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=List[InvoiceResponse])
def list_invoices(
    status: Optional[str] = Query(None),
    client_id: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.list_invoices(
        db, current_user.organization_id, status=status, client_id=client_id, skip=skip, limit=limit
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetailResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_invoice_detail(db, invoice_id, current_user.organization_id)


# ── Invoice Payments ────────────────────────────────────────────────────────

@router.get(
    "/invoices/{invoice_id}/payments",
    response_model=List[PaymentResponse],
)
def list_payments(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.list_payments(db, invoice_id, current_user.organization_id)


@router.post(
    "/invoices/{invoice_id}/payments",
    response_model=PaymentResponse,
    status_code=201,
)
def register_payment(
    invoice_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.register_payment(
        db, invoice_id, data, current_user.organization_id, current_user.id
    )


# ── Invoice Case ────────────────────────────────────────────────────────────

@router.get(
    "/invoices/{invoice_id}/case",
    response_model=CollectionCaseDetailResponse,
)
def get_invoice_case(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_case_for_invoice(db, invoice_id, current_user.organization_id)


# ── Invoice Timeline ───────────────────────────────────────────────────────

@router.get(
    "/invoices/{invoice_id}/timeline",
    response_model=List[TimelineEventResponse],
)
def get_invoice_timeline(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_invoice_timeline(db, invoice_id, current_user.organization_id)


# ── Invoice Transition ─────────────────────────────────────────────────────

@router.post(
    "/invoices/{invoice_id}/transition",
    response_model=InvoiceDetailResponse,
)
def transition_invoice(
    invoice_id: int,
    data: InvoiceTransitionRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.transition_invoice(
        db, invoice_id, data, current_user.organization_id, current_user.id
    )


# ── Collection Cases ───────────────────────────────────────────────────────

@router.get("/cases", response_model=List[CollectionCaseResponse])
def list_collection_cases(
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.list_collection_cases(
        db, current_user.organization_id, status=status, skip=skip, limit=limit
    )
