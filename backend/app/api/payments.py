from typing import List

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.payment_schema import (
    PaymentCreate,
    PaymentResponse,
    PaymentStatusUpdate,
)
from app.services.payment_service import PaymentService


router = APIRouter(
    prefix="/payments",
    tags=["Payments"],
)


# ==========================================================
# Create Payment
# ==========================================================

@router.post(
    "/",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_payment(
    request: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a payment against an invoice.

    New payments are created with:

        Pending
    """

    service = PaymentService(db)

    try:
        return service.create_payment(
            request=request,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# ==========================================================
# Get All Payments
# ==========================================================

@router.get(
    "/",
    response_model=List[PaymentResponse],
)
def get_all_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    return service.get_all_payments()


# ==========================================================
# Get Payment by ID
# ==========================================================

@router.get(
    "/{payment_id}",
    response_model=PaymentResponse,
)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    payment = service.get_payment(payment_id)

    if payment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found.",
        )

    return payment


# ==========================================================
# Get Payments for Invoice
# ==========================================================

@router.get(
    "/invoice/{invoice_id}",
    response_model=List[PaymentResponse],
)
def get_payments_for_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    try:
        return service.get_by_invoice(
            invoice_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ==========================================================
# Payment Summary for Invoice
# ==========================================================

@router.get(
    "/invoice/{invoice_id}/summary",
)
def get_invoice_payment_summary(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    try:
        return service.get_invoice_payment_summary(
            invoice_id
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ==========================================================
# Mark Payment as Paid
# ==========================================================

@router.post(
    "/{payment_id}/paid",
    response_model=PaymentResponse,
)
def mark_payment_paid(
    payment_id: int,
    request: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    try:
        return service.update_status(
            payment_id=payment_id,
            new_status="Paid",
            user_id=current_user.id,
            remarks=request.remarks,
            payment_date=request.payment_date,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Mark Payment as Failed
# ==========================================================

@router.post(
    "/{payment_id}/failed",
    response_model=PaymentResponse,
)
def mark_payment_failed(
    payment_id: int,
    request: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    try:
        return service.update_status(
            payment_id=payment_id,
            new_status="Failed",
            user_id=current_user.id,
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Cancel Payment
# ==========================================================

@router.post(
    "/{payment_id}/cancel",
    response_model=PaymentResponse,
)
def cancel_payment(
    payment_id: int,
    request: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    try:
        return service.update_status(
            payment_id=payment_id,
            new_status="Cancelled",
            user_id=current_user.id,
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Generic Payment Status Update
# ==========================================================

@router.put(
    "/{payment_id}/status",
    response_model=PaymentResponse,
)
def update_payment_status(
    payment_id: int,
    request: PaymentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PaymentService(db)

    try:
        return service.update_status(
            payment_id=payment_id,
            new_status=request.status,
            user_id=current_user.id,
            remarks=request.remarks,
            payment_date=request.payment_date,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )