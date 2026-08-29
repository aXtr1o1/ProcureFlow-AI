from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.security import get_current_user
from app.database.models import User
from app.schemas.matching_schema import MatchingResponse
from app.services.matching_service import MatchingService


router = APIRouter(
    prefix="/matching",
    tags=["Invoice Matching"]
)


# ==========================================================
# Match Invoice with Purchase Order
# ==========================================================
@router.post(
    "/{invoice_id}",
    response_model=MatchingResponse
)
def match_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    matching_service = MatchingService(db)

    result = matching_service.match_invoice_with_po(
        invoice_id,
        performed_by_id=current_user.id,
    )

    if result["success"] is False:
        raise HTTPException(
            status_code=404,
            detail=result["message"]
        )

    return result
