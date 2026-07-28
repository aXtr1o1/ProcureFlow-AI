from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.azure_ai_search_service import AzureAISearchService
from app.schemas.search_schema import SearchResponse, InvoiceSummaryResponse

router = APIRouter(
    prefix="/search",
    tags=["Search"]
)


@router.get("/", response_model=SearchResponse)
def search_invoices(
    query: str,
    db: Session = Depends(get_db)
):
    service = AzureAISearchService(db)

    results = service.search(query)

    return SearchResponse(
        success=True,
        total_results=len(results),
        results=results
    )


@router.get("/summary", response_model=InvoiceSummaryResponse)
def invoice_summary(
    start_date: str,
    end_date: str,
    db: Session = Depends(get_db)
):
    service = AzureAISearchService(db)

    return service.invoice_summary(
        start_date=start_date,
        end_date=end_date
    )


@router.get("/status/{status}", response_model=SearchResponse)
def search_by_status(
    status: str,
    db: Session = Depends(get_db)
):
    service = AzureAISearchService(db)

    results = service.search_by_status(status)

    return SearchResponse(
        success=True,
        total_results=len(results),
        results=results
    )


@router.get("/vendor/{vendor_name}", response_model=SearchResponse)
def search_by_vendor(
    vendor_name: str,
    db: Session = Depends(get_db)
):
    service = AzureAISearchService(db)

    results = service.search_by_vendor(vendor_name)

    return SearchResponse(
        success=True,
        total_results=len(results),
        results=results
    )