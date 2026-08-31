from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.security import get_current_user
from app.database.models import User
from app.schemas.matching_schema import MatchingResponse
from app.services.matching_service import MatchingService
from pydantic import BaseModel

class MatchingDecisionRequest(BaseModel):
    remarks: str | None = None


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


# ==========================================================
# Approve Match Override
# ==========================================================
@router.post("/{invoice_id}/approve-override")
def approve_match_override(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    matching_service = MatchingService(db)

    try:
        invoice = matching_service.approve_match_override(
            invoice_id=invoice_id,
            performed_by_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )

    return {
        "success": True,
        "invoice_id": invoice.id,
        "status": invoice.processing_status,
        "message": (
            "Match override approved. "
            "Invoice is ready for approval."
        ),
    }


# ==========================================================
# Reject Invoice During Match Review
# ==========================================================
@router.post("/{invoice_id}/reject")
def reject_invoice_match(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    matching_service = MatchingService(db)

    try:
        invoice = matching_service.reject_invoice_match(
            invoice_id=invoice_id,
            performed_by_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )

    return {
        "success": True,
        "invoice_id": invoice.id,
        "status": invoice.processing_status,
        "message": (
            "Invoice rejected successfully. "
            "It will not proceed to payment."
        ),
    }

# ==========================================================
# Approve Matching Exception
# ==========================================================
@router.post("/{invoice_id}/approve")
def approve_matching_exception(
    invoice_id: int,
    request: MatchingDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    matching_service = MatchingService(db)

    try:
        invoice = matching_service.approve_match_override(
            invoice_id=invoice_id,
            performed_by_id=current_user.id,
            remarks=request.remarks,
        )

        return {
            "success": True,
            "invoice_id": invoice.id,
            "status": invoice.processing_status,
            "message": (
                "Matching exception approved. "
                "Invoice is now awaiting approval."
            ),
        }

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )


# ==========================================================
# Reject Invoice During Matching Review
# ==========================================================
@router.post("/{invoice_id}/reject")
def reject_matching_exception(
    invoice_id: int,
    request: MatchingDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    matching_service = MatchingService(db)

    try:
        invoice = matching_service.reject_invoice_match(
            invoice_id=invoice_id,
            performed_by_id=current_user.id,
            remarks=request.remarks,
        )

        return {
            "success": True,
            "invoice_id": invoice.id,
            "status": invoice.processing_status,
            "message": (
                "Invoice rejected successfully. "
                "It will not proceed to payment."
            ),
        }

    except ValueError as error:
        raise HTTPException(
            status_code=409,
            detail=str(error),
        )
