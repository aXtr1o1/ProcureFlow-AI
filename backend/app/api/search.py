from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.invoice_service import InvoiceService
from app.schemas.search_schema import SearchResponse

router = APIRouter(
    prefix="/search",
    tags=["Invoice Search"]
)


def _serialize_db_invoice(invoice, line_items) -> Dict[str, Any]:
    return {
        "id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "vendor_name": (invoice.vendor_name or "").replace("\n", " ").strip(),
        "vendor_address": invoice.vendor_address,
        "customer_name": invoice.customer_name,
        "invoice_date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "purchase_order_number": invoice.purchase_order_number or None,
        "currency": invoice.currency,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "total_amount": invoice.total_amount,
        "processing_status": invoice.processing_status,
        "blob_name": invoice.blob_name,
        "blob_url": invoice.blob_url,
        "line_items": [
            {
                "id": item.id,
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "amount": item.amount,
            }
            for item in line_items
        ],
        "source": "sqlite",
    }


def _format_invoices(db: Session, invoices: List) -> List[Dict[str, Any]]:
    invoice_service = InvoiceService(db)
    results = []

    for invoice in invoices:
        line_items = invoice_service.get_invoice_line_items(invoice.id)
        results.append(_serialize_db_invoice(invoice, line_items))

    return results


# ==========================================================
# Search Documents (SQLite)
# ==========================================================
@router.get(
    "/",
    response_model=SearchResponse,
    status_code=status.HTTP_200_OK
)
def search_documents(
    query: str = Query(..., min_length=1),
    db: Session = Depends(get_db)
):
    """
    Search invoices stored in the SQLite database.
    """
    invoice_service = InvoiceService(db)
    invoices = invoice_service.search_invoices(query)
    formatted_results = _format_invoices(db, invoices)

    return SearchResponse(
        query=query,
        total_results=len(formatted_results),
        results=formatted_results
    )


# ==========================================================
# Search by Invoice Number
# ==========================================================
@router.get(
    "/invoice/{invoice_number}",
    response_model=SearchResponse
)
def search_invoice(
    invoice_number: str,
    db: Session = Depends(get_db)
):
    invoice_service = InvoiceService(db)
    invoices = invoice_service.search_invoices_by_number(invoice_number)
    formatted_results = _format_invoices(db, invoices)

    return SearchResponse(
        query=invoice_number,
        total_results=len(formatted_results),
        results=formatted_results
    )


# ==========================================================
# Search by Vendor
# ==========================================================
@router.get(
    "/vendor/{vendor_name}",
    response_model=SearchResponse
)
def search_vendor(
    vendor_name: str,
    db: Session = Depends(get_db)
):
    invoice_service = InvoiceService(db)
    invoices = invoice_service.search_invoices_by_vendor(vendor_name)
    formatted_results = _format_invoices(db, invoices)

    if not formatted_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found."
        )

    return SearchResponse(
        query=vendor_name,
        total_results=len(formatted_results),
        results=formatted_results
    )
