import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.azure_search_service import AzureSearchService
from app.schemas.search_schema import SearchResponse

router = APIRouter(
    prefix="/search",
    tags=["Azure AI Search"]
)


# ==========================================================
# Search Documents
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
    Search invoices, OCR text, summaries and purchase orders
    using Azure AI Search.
    """

    service = AzureSearchService(db)

    try:
        results = service.search(query) or []

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

    formatted_results = []

    for item in results:
        try:
            invoice = json.loads(item["content"])

            # Skip non-invoice documents
            if not invoice.get("invoice_number"):
                continue

            formatted_results.append({
                "id": item.get("id"),
                "invoice_number": invoice.get("invoice_number"),
                "vendor_name": invoice.get("vendor_name"),
                "invoice_date": invoice.get("invoice_date"),
                "total_amount": invoice.get("total_amount"),
                "processing_status": invoice.get("processing_status", "Uploaded"),
                "blob_name": invoice.get("blob_name"),
                "blob_url": invoice.get("blob_url"),
            })

        except Exception:
            continue


    # Remove duplicate invoices
    unique_results = {}

    for invoice in formatted_results:
        unique_results[invoice["invoice_number"]] = invoice

    formatted_results = list(unique_results.values())

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
    service = AzureSearchService(db)

    try:
        results = service.search_by_invoice_number(invoice_number)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

    formatted_results = []

    for item in results:

        try:

            invoice = json.loads(item["content"])

            if not invoice.get("invoice_number"):
                continue

            formatted_results.append({

                "id": item.get("id"),

                "invoice_number": invoice.get("invoice_number"),

                "vendor_name": invoice.get("vendor_name"),

                "invoice_date": invoice.get("invoice_date"),

                "total_amount": invoice.get("total_amount"),

                "processing_status": invoice.get(
                    "processing_status",
                    "Uploaded"
                ),

                "blob_name": invoice.get("blob_name"),

                "blob_url": invoice.get("blob_url")

            })

        except Exception:
            continue

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
    service = AzureSearchService(db)

    results = service.search_by_vendor(
        vendor_name
    )

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found."
        )

    return SearchResponse(
        query=vendor_name,
        total_results=len(results),
        results=results
    )
