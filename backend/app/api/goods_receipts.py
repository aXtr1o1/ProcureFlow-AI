from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.goods_receipt_schema import (
    GoodsReceiptCreate,
    GoodsReceiptResponse,
    GoodsReceiptStatusUpdate,
    GoodsReceiptDecisionRequest,
)
from app.services.goods_receipt_service import GoodsReceiptService


router = APIRouter(
    prefix="/goods-receipts",
    tags=["Goods Receipts"],
)


# ==========================================================
# Create Goods Receipt / Service Entry
# ==========================================================
@router.post(
    "/",
    response_model=GoodsReceiptResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_goods_receipt(
    request: GoodsReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a Goods Receipt or Service Entry against a
    Vendor Accepted Purchase Order.
    """

    service = GoodsReceiptService(db)

    try:
        return service.create_goods_receipt(
            request=request,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        )


# ==========================================================
# Get All Goods Receipts
# ==========================================================
@router.get(
    "/",
    response_model=List[GoodsReceiptResponse],
)
def get_all_goods_receipts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = GoodsReceiptService(db)

    return service.get_all_goods_receipts()


# ==========================================================
# Get Goods Receipt by ID
# ==========================================================
@router.get(
    "/{receipt_id}",
    response_model=GoodsReceiptResponse,
)
def get_goods_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = GoodsReceiptService(db)

    receipt = service.get_goods_receipt(receipt_id)

    if receipt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Goods Receipt not found.",
        )

    return receipt


# ==========================================================
# Get Goods Receipts for Purchase Order
# ==========================================================
@router.get(
    "/purchase-order/{po_id}",
    response_model=List[GoodsReceiptResponse],
)
def get_goods_receipts_for_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = GoodsReceiptService(db)

    try:
        return service.get_by_purchase_order(po_id)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        )


# ==========================================================
# Submit Goods Receipt
# ==========================================================
@router.post(
    "/{receipt_id}/submit",
    response_model=GoodsReceiptResponse,
)
def submit_goods_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a Draft Goods Receipt.

    Allowed:
        Draft -> Submitted
    """

    service = GoodsReceiptService(db)

    try:
        return service.submit_goods_receipt(
            receipt_id=receipt_id,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Accept Goods Receipt
# ==========================================================
@router.post(
    "/{receipt_id}/accept",
    response_model=GoodsReceiptResponse,
)
def accept_goods_receipt(
    receipt_id: int,
    request: GoodsReceiptDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Accept a submitted Goods Receipt.

    Allowed:
        Submitted -> Accepted
    """

    service = GoodsReceiptService(db)

    try:
        return service.update_status(
            receipt_id=receipt_id,
            new_status="Accepted",
            user_id=current_user.id,
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Reject Goods Receipt
# ==========================================================
@router.post(
    "/{receipt_id}/reject",
    response_model=GoodsReceiptResponse,
)
def reject_goods_receipt(
    receipt_id: int,
    request: GoodsReceiptDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject a submitted Goods Receipt.

    Allowed:
        Submitted -> Rejected
    """

    service = GoodsReceiptService(db)

    try:
        return service.update_status(
            receipt_id=receipt_id,
            new_status="Rejected",
            user_id=current_user.id,
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Update Goods Receipt Status
# ==========================================================
@router.put(
    "/{receipt_id}/status",
    response_model=GoodsReceiptResponse,
)
def update_goods_receipt_status(
    receipt_id: int,
    request: GoodsReceiptStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update Goods Receipt status.

    Valid workflow:
        Draft -> Submitted
        Submitted -> Accepted
        Submitted -> Rejected

    This endpoint is mainly provided for administrative/status
    update purposes. Normal workflow should use the dedicated
    submit, accept, and reject endpoints.
    """

    service = GoodsReceiptService(db)

    try:
        # If status is an Enum, use .value.
        new_status = (
            request.status.value
            if hasattr(request.status, "value")
            else request.status
        )

        return service.update_status(
            receipt_id=receipt_id,
            new_status=new_status,
            user_id=current_user.id,
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )