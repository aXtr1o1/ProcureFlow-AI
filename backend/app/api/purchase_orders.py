from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User
from app.schemas.purchase_order_schema import (
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
    PurchaseOrderDecisionRequest,
    PurchaseOrderVendorResponseRequest,
)
from app.services.purchase_order_service import PurchaseOrderService


router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)


# ==========================================================
# Purchase Order Approval Workflow
# ==========================================================

@router.post(
    "/{po_id}/submit",
    response_model=PurchaseOrderResponse,
)
def submit_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit a newly created Purchase Order for approval.

    Allowed:
        Created -> Approval Pending
    """

    service = PurchaseOrderService(db)

    try:
        return service.submit_for_approval(
            po_id=po_id,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.post(
    "/{po_id}/approve",
    response_model=PurchaseOrderResponse,
)
def approve_purchase_order(
    po_id: int,
    request: PurchaseOrderDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve a Purchase Order.

    Allowed:
        Approval Pending -> Approved
    """

    service = PurchaseOrderService(db)

    try:
        return service.decide(
            po_id=po_id,
            user_id=current_user.id,
            decision="Approved",
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.post(
    "/{po_id}/reject",
    response_model=PurchaseOrderResponse,
)
def reject_purchase_order(
    po_id: int,
    request: PurchaseOrderDecisionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject a Purchase Order.

    Allowed:
        Approval Pending -> Rejected
    """

    service = PurchaseOrderService(db)

    try:
        return service.decide(
            po_id=po_id,
            user_id=current_user.id,
            decision="Rejected",
            remarks=request.remarks,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Vendor Workflow
# ==========================================================

@router.post(
    "/{po_id}/send-to-vendor",
    response_model=PurchaseOrderResponse,
)
def send_purchase_order_to_vendor(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send an approved Purchase Order to the vendor.

    Allowed:
        Approved -> Sent
    """

    service = PurchaseOrderService(db)

    try:
        return service.send_to_vendor(
            po_id=po_id,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.post(
    "/{po_id}/vendor-accept",
    response_model=PurchaseOrderResponse,
)
def vendor_accept_purchase_order(
    po_id: int,
    request: PurchaseOrderVendorResponseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record vendor acceptance.

    Allowed:
        Sent -> Acknowledged
    """

    service = PurchaseOrderService(db)

    try:
        return service.record_vendor_response(
            po_id=po_id,
            status="Vendor Accepted",
            remarks=request.remarks,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


@router.post(
    "/{po_id}/vendor-reject",
    response_model=PurchaseOrderResponse,
)
def vendor_reject_purchase_order(
    po_id: int,
    request: PurchaseOrderVendorResponseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record vendor rejection.

    Allowed:
        Sent -> Vendor Rejected
    """

    service = PurchaseOrderService(db)

    try:
        return service.record_vendor_response(
            po_id=po_id,
            status="Vendor Rejected",
            remarks=request.remarks,
            user_id=current_user.id,
        )

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        )


# ==========================================================
# Get All Purchase Orders
# ==========================================================
@router.get(
    "/",
    response_model=List[PurchaseOrderResponse],
)
def get_all_purchase_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PurchaseOrderService(db)

    return service.get_all_purchase_orders()


# ==========================================================
# Get Purchase Order by Number
# ==========================================================
@router.get(
    "/{po_number}",
    response_model=PurchaseOrderResponse,
)
def get_purchase_order(
    po_number: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PurchaseOrderService(db)

    purchase_order = service.get_purchase_order_by_number(
        po_number
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase Order not found.",
        )

    return purchase_order


# ==========================================================
# Update Purchase Order Status
# ==========================================================
@router.put(
    "/{po_id}/status",
    response_model=PurchaseOrderResponse,
)
def update_purchase_order_status(
    po_id: int,
    status_update: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PurchaseOrderService(db)

    try:
        purchase_order = service.update_status(
            po_id,
            status_update.status.value,
            user_id=current_user.id
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase Order not found.",
        )

    return purchase_order


# ==========================================================
# Create Purchase Order from Approved PR
# ==========================================================
@router.post(
    "/from-pr/{pr_id}",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_purchase_order_from_pr(
    pr_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = PurchaseOrderService(db)

    try:
        return service.create_from_approved_pr(
            pr_id=pr_id,
            user_id=current_user.id,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
