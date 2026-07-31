from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.summary_schema import SummaryResponse
from app.services.summary_services import SummaryService

router = APIRouter(
    prefix="/summary",
    tags=["Invoice Summary"]
)


# ==========================================================
# Generate Invoice Summary
# ==========================================================
@router.post(
    "/generate/{invoice_id}",
    response_model=SummaryResponse,
    status_code=status.HTTP_200_OK
)
def generate_summary(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    service = SummaryService(db)

    try:
        summary = service.generate_summary(invoice_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate invoice summary."
        )

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    return summary