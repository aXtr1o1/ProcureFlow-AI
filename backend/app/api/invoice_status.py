from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.invoice_status_schema import (
    CurrentInvoiceStatusResponse,
    InvoiceStatusResponse
)
from app.services.invoice_status_service import InvoiceStatusService

router = APIRouter(
    prefix="/invoice-status",
    tags=["Invoice Status"]
)


# ==========================================================
# Get Invoice Current Status
# ==========================================================
@router.get(
    "/{invoice_id}",
    response_model=CurrentInvoiceStatusResponse
)
def get_invoice_status(
    invoice_id: int,
    db: Session = Depends(get_db)
):

    service = InvoiceStatusService(db)

    invoice = service.get_invoice_status(invoice_id)

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    return invoice


# ==========================================================
# Get Invoice Status History
# ==========================================================
@router.get(
    "/history/{invoice_id}",
    response_model=List[InvoiceStatusResponse]
)
def get_invoice_status_history(
    invoice_id: int,
    db: Session = Depends(get_db)
):

    service = InvoiceStatusService(db)

    history = service.get_status_history(invoice_id)

    if not history:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No status history found."
        )

    return history