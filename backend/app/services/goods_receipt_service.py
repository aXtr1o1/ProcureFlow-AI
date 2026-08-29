from typing import List, Optional
import uuid

from sqlalchemy.orm import Session

from app.database.models import (
    GoodsReceipt,
    GoodsReceiptLine,
    ProcurementPurchaseOrder,
    ProcurementPurchaseOrderLine,
)
from app.schemas.goods_receipt_schema import GoodsReceiptCreate
from app.services.audit_service import AuditService


class GoodsReceiptService:
    """
    Service responsible for Goods Receipt / Service Entry operations.
    """

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================
    # Create Goods Receipt / Service Entry
    # ==========================================================
    def create_goods_receipt(
        self,
        request: GoodsReceiptCreate,
        user_id: int,
    ) -> GoodsReceipt:

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == request.purchase_order_id
            )
            .first()
        )

        if purchase_order is None:
            raise ValueError("Purchase Order not found.")

        # ------------------------------------------------------
        # A Goods Receipt can only be created after vendor
        # acceptance.
        # ------------------------------------------------------
        if purchase_order.status != "Vendor Accepted":
            raise ValueError(
                "Goods Receipt can only be created for a "
                "Vendor Accepted Purchase Order."
            )

        if not request.line_items:
            raise ValueError(
                "At least one Goods Receipt line is required."
            )

        # ------------------------------------------------------
        # Generate receipt number
        # ------------------------------------------------------
        receipt_number = (
            f"GR-{uuid.uuid4().hex[:8].upper()}"
        )

        goods_receipt = GoodsReceipt(
            receipt_number=receipt_number,
            purchase_order_id=purchase_order.id,
            receipt_type=request.receipt_type,
            status="Draft",
            received_by_id=user_id,
            received_date=request.received_date,
            remarks=request.remarks,
        )

        self.db.add(goods_receipt)
        self.db.flush()

        # ------------------------------------------------------
        # Validate and create receipt lines
        # ------------------------------------------------------
        for item in request.line_items:

            po_line = (
                self.db.query(ProcurementPurchaseOrderLine)
                .filter(
                    ProcurementPurchaseOrderLine.id
                    == item.purchase_order_line_id,
                    ProcurementPurchaseOrderLine.purchase_order_id
                    == purchase_order.id,
                )
                .first()
            )

            if po_line is None:
                raise ValueError(
                    f"Purchase Order line "
                    f"{item.purchase_order_line_id} not found."
                )

            if item.received_quantity < 0:
                raise ValueError(
                    "Received quantity cannot be negative."
                )

            if item.accepted_quantity < 0:
                raise ValueError(
                    "Accepted quantity cannot be negative."
                )

            if item.rejected_quantity < 0:
                raise ValueError(
                    "Rejected quantity cannot be negative."
                )

            if (
                item.accepted_quantity
                + item.rejected_quantity
                > item.received_quantity
            ):
                raise ValueError(
                    "Accepted quantity plus rejected quantity "
                    "cannot exceed received quantity."
                )

            # --------------------------------------------------
            # Do not allow a receipt to exceed PO quantity.
            # --------------------------------------------------
            existing_received = (
                self.db.query(GoodsReceiptLine)
                .join(GoodsReceipt)
                .filter(
                    GoodsReceipt.purchase_order_id
                    == purchase_order.id,
                    GoodsReceiptLine.purchase_order_line_id
                    == po_line.id,
                    GoodsReceipt.status != "Rejected",
                )
                .all()
            )

            previously_received = sum(
                line.received_quantity
                for line in existing_received
            )

            remaining_quantity = (
                po_line.quantity - previously_received
            )

            if item.received_quantity > remaining_quantity:
                raise ValueError(
                    f"Received quantity for "
                    f"'{po_line.description}' exceeds the "
                    f"remaining Purchase Order quantity. "
                    f"Remaining quantity: {remaining_quantity}."
                )

            goods_receipt_line = GoodsReceiptLine(
                goods_receipt_id=goods_receipt.id,
                purchase_order_line_id=po_line.id,
                description=(
                    item.description
                    if item.description
                    else po_line.description
                ),
                ordered_quantity=po_line.quantity,
                received_quantity=item.received_quantity,
                accepted_quantity=item.accepted_quantity,
                rejected_quantity=item.rejected_quantity,
                remarks=item.remarks,
            )

            self.db.add(goods_receipt_line)

        # ------------------------------------------------------
        # Save
        # ------------------------------------------------------
        self.db.commit()
        self.db.refresh(goods_receipt)

        AuditService(self.db).log(
            user_id=user_id,
            action="CREATE",
            module="Goods Receipt",
            status="SUCCESS",
            message=(
                f"Goods Receipt {goods_receipt.receipt_number} "
                f"created against Purchase Order "
                f"{purchase_order.po_number}."
            ),
        )

        return goods_receipt

    # ==========================================================
    # Get All Goods Receipts
    # ==========================================================
    def get_all_goods_receipts(
        self,
    ) -> List[GoodsReceipt]:

        return (
            self.db.query(GoodsReceipt)
            .order_by(GoodsReceipt.id.desc())
            .all()
        )

    # ==========================================================
    # Get Goods Receipt by ID
    # ==========================================================
    def get_goods_receipt(
        self,
        receipt_id: int,
    ) -> Optional[GoodsReceipt]:

        return (
            self.db.query(GoodsReceipt)
            .filter(
                GoodsReceipt.id == receipt_id
            )
            .first()
        )

    # ==========================================================
    # Get Goods Receipts for Purchase Order
    # ==========================================================
    def get_by_purchase_order(
        self,
        po_id: int,
    ) -> List[GoodsReceipt]:

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == po_id
            )
            .first()
        )

        if purchase_order is None:
            raise ValueError("Purchase Order not found.")

        return (
            self.db.query(GoodsReceipt)
            .filter(
                GoodsReceipt.purchase_order_id == po_id
            )
            .order_by(GoodsReceipt.id.desc())
            .all()
        )

    # ==========================================================
    # Submit Goods Receipt
    # ==========================================================
    def submit_goods_receipt(
        self,
        receipt_id: int,
        user_id: int,
    ) -> GoodsReceipt:

        receipt = self._get_required(receipt_id)

        if receipt.status != "Draft":
            raise ValueError(
                "Only Draft Goods Receipts can be submitted."
            )

        if not receipt.line_items:
            raise ValueError(
                "A Goods Receipt must contain at least one line."
            )

        # ------------------------------------------------------
        # Validate quantities before submission
        # ------------------------------------------------------
        for line in receipt.line_items:

            if line.received_quantity < 0:
                raise ValueError(
                    "Received quantity cannot be negative."
                )

            if line.accepted_quantity < 0:
                raise ValueError(
                    "Accepted quantity cannot be negative."
                )

            if line.rejected_quantity < 0:
                raise ValueError(
                    "Rejected quantity cannot be negative."
                )

            if (
                line.accepted_quantity
                + line.rejected_quantity
                > line.received_quantity
            ):
                raise ValueError(
                    f"Accepted plus rejected quantity cannot "
                    f"exceed received quantity for "
                    f"'{line.description}'."
                )

        return self._transition(
            receipt_id=receipt_id,
            target_status="Submitted",
            user_id=user_id,
            action="SUBMIT",
            message="Goods Receipt submitted for processing.",
        )

    # ==========================================================
    # Update Goods Receipt Status
    # ==========================================================
    def update_status(
        self,
        receipt_id: int,
        new_status: str,
        user_id: int,
        remarks: Optional[str] = None,
    ) -> GoodsReceipt:

        receipt = self._get_required(receipt_id)

        allowed_transitions = {
            "Draft": {"Submitted"},
            "Submitted": {"Accepted", "Rejected"},
            "Accepted": set(),
            "Rejected": set(),
        }

        current_status = receipt.status

        if new_status not in allowed_transitions.get(
            current_status,
            set(),
        ):
            raise ValueError(
                f"Invalid Goods Receipt status transition: "
                f"{current_status} -> {new_status}"
            )

        receipt.status = new_status

        if remarks:
            receipt.remarks = remarks

        self.db.commit()
        self.db.refresh(receipt)

        AuditService(self.db).log(
            user_id=user_id,
            action="STATUS_UPDATE",
            module="Goods Receipt",
            status="SUCCESS",
            message=(
                f"Goods Receipt {receipt.receipt_number} "
                f"status changed from {current_status} "
                f"to {new_status}."
            ),
        )

        return receipt

    # ==========================================================
    # Internal: Get Required Receipt
    # ==========================================================
    def _get_required(
        self,
        receipt_id: int,
    ) -> GoodsReceipt:

        receipt = (
            self.db.query(GoodsReceipt)
            .filter(
                GoodsReceipt.id == receipt_id
            )
            .first()
        )

        if receipt is None:
            raise ValueError(
                "Goods Receipt not found."
            )

        return receipt

    # ==========================================================
    # Internal: Transition
    # ==========================================================
    def _transition(
        self,
        receipt_id: int,
        target_status: str,
        user_id: int,
        action: str,
        message: str,
    ) -> GoodsReceipt:

        receipt = self.update_status(
            receipt_id=receipt_id,
            new_status=target_status,
            user_id=user_id,
        )

        AuditService(self.db).log(
            user_id=user_id,
            action=action,
            module="Goods Receipt",
            status="SUCCESS",
            message=(
                f"Goods Receipt "
                f"{receipt.receipt_number}: {message}"
            ),
        )

        return receipt