from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.purchase_order_schema import (
    PurchaseOrderCreate,
    PurchaseOrderResponse,
    PurchaseOrderStatusUpdate,
)
from app.services.purchase_order_service import PurchaseOrderService

router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"]
)

# ==========================================================
# Create Purchase Order
# ==========================================================
@router.post(
    "/",
    response_model=PurchaseOrderResponse,
    status_code=status.HTTP_201_CREATED
)
def create_purchase_order(
    po_data: PurchaseOrderCreate,
    db: Session = Depends(get_db)
):

    service = PurchaseOrderService(db)

    try:
        purchase_order = service.create_purchase_order(
            po_data.model_dump()
        )

        return purchase_order

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ==========================================================
# Get All Purchase Orders
# ==========================================================
@router.get(
    "/",
    response_model=List[PurchaseOrderResponse]
)
def get_all_purchase_orders(
    db: Session = Depends(get_db)
):

    service = PurchaseOrderService(db)

    return service.get_all_purchase_orders()


# ==========================================================
# Get Purchase Order by Number
# ==========================================================
@router.get(
    "/{po_number}",
    response_model=PurchaseOrderResponse
)
def get_purchase_order(
    po_number: str,
    db: Session = Depends(get_db)
):

    service = PurchaseOrderService(db)

    purchase_order = service.get_purchase_order_by_number(
        po_number
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase Order not found."
        )

    return purchase_order


# ==========================================================
# Update Purchase Order Status
# ==========================================================
@router.put(
    "/{po_id}/status",
    response_model=PurchaseOrderResponse
)
def update_purchase_order_status(
    po_id: int,
    status_update: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db)
):

    service = PurchaseOrderService(db)

    purchase_order = service.update_status(
        po_id,
        status_update.status
    )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase Order not found."
        )

    return purchase_order
# ==========================================================
# Delete Purchase Order
# ==========================================================
@router.delete(
    "/{po_id}"
)
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db)
):

    service = PurchaseOrderService(db)

    deleted = service.delete_purchase_order(po_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase Order not found."
        )

    return {
        "success": True,
        "message": "Purchase Order deleted successfully."
    }

# ==========================================================
# Generate Purchase Order from Invoice
# ==========================================================
@router.post(
    "/generate/{invoice_id}",
    response_model=PurchaseOrderResponse
)
def generate_purchase_order(
    invoice_id: int,
    db: Session = Depends(get_db)
):
    service = PurchaseOrderService(db)

    try:
        purchase_order = service.generate_purchase_order(invoice_id)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if purchase_order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    return purchase_order