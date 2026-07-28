from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.core.security import get_current_user
from app.database.models import User
from app.services.approval_service import ApprovalService

from app.schemas.approval_schema import (
    ApproveInvoiceRequest,
    RejectInvoiceRequest,
    ApprovalResponse,
    ApprovalHistoryResponse,
)

router = APIRouter(
    prefix="/approval",
    tags=["Approval"]
)


@router.get("/pending")
def get_pending_approvals(
    db: Session = Depends(get_db)
):

    service = ApprovalService(db)

    return service.get_pending_invoices()


@router.get("/{invoice_id}")
def get_approval_details(
    invoice_id: int,
    db: Session = Depends(get_db)
):

    service = ApprovalService(db)

    invoice = service.get_invoice(invoice_id)

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    return invoice


@router.post(
    "/{invoice_id}/approve",
    response_model=ApprovalResponse
)
def approve_invoice(
    invoice_id: int,
    request: ApproveInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    service = ApprovalService(db)

    invoice = service.approve_invoice(
        invoice_id=invoice_id,
        approved_by=request.approved_by,
        user_id=current_user.id
    )

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    return ApprovalResponse(
        success=True,
        invoice_id=invoice.id,
        status=invoice.processing_status,
        message="Invoice approved successfully."
    )


@router.post(
    "/{invoice_id}/reject",
    response_model=ApprovalResponse
)
def reject_invoice(
    invoice_id: int,
    request: RejectInvoiceRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    service = ApprovalService(db)

    invoice = service.reject_invoice(
        invoice_id=invoice_id,
        rejected_by=request.rejected_by,
        reason=request.reason,
        user_id=current_user.id
    )

    if invoice is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    return ApprovalResponse(
        success=True,
        invoice_id=invoice.id,
        status=invoice.processing_status,
        message="Invoice rejected successfully."
    )

@router.get(
    "/history/{invoice_id}",
    response_model=list[ApprovalHistoryResponse]
)
def approval_history(
    invoice_id: int,
    db: Session = Depends(get_db)
):

    service = ApprovalService(db)

    return service.get_history(invoice_id)