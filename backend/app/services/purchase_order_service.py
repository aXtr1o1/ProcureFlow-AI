import uuid
from typing import Optional, List

from sqlalchemy.orm import Session, joinedload

from app.database.models import (
    PurchaseRequisition,
    ProcurementPurchaseOrder,
    ProcurementPurchaseOrderLine,
    PurchaseOrderApproval,
    PurchaseOrderVendorResponse,
)

from app.services.audit_service import AuditService


class PurchaseOrderService:
    """
    Service responsible for Purchase Order operations.

    PO lifecycle:

        Created
            ↓
        Approval Pending
            ↓
        Approved
            ↓
        Sent
            ↓
        Acknowledged
            ↓
        Closed

    Rejection paths:

        Approval Pending → Rejected
        Sent → Vendor Rejected

    Cancellation:

        Created / Approved / Acknowledged → Cancelled
    """

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================
    # Get Purchase Order by Number
    # ==========================================================

    def get_purchase_order_by_number(
        self,
        po_number: str,
    ) -> Optional[ProcurementPurchaseOrder]:

        if not po_number:
            return None

        return (
            self.db.query(ProcurementPurchaseOrder)
            .options(
                joinedload(
                    ProcurementPurchaseOrder.line_items
                )
            )
            .filter(
                ProcurementPurchaseOrder.po_number == po_number
            )
            .first()
    )
    # ==========================================================
    # Get All Purchase Orders
    # ==========================================================

    def get_all_purchase_orders(
        self,
    ) -> List[ProcurementPurchaseOrder]:

        return (
            self.db.query(ProcurementPurchaseOrder)
            .order_by(
                ProcurementPurchaseOrder.id.desc()
            )
            .all()
        )

    # ==========================================================
    # Get Purchase Order by ID
    # ==========================================================

    def _get_required(
        self,
        po_id: int,
    ) -> ProcurementPurchaseOrder:

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == po_id
            )
            .first()
        )

        if purchase_order is None:
            raise ValueError(
                "Purchase Order not found."
            )

        return purchase_order

    # ==========================================================
    # Purchase Order Status Transition
    # ==========================================================

    def update_status(
        self,
        po_id: int,
        status: str,
        user_id: int,
    ) -> Optional[ProcurementPurchaseOrder]:

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == po_id
            )
            .first()
        )

        if purchase_order is None:
            return None

        allowed_transitions = {
            "Created": {
                "Pending Approval",
                "Cancelled",
            },

            "Pending Approval": {
                "Approved",
                "Rejected",
            },

            "Approved": {
                "Sent",
                "Cancelled",
            },

            "Sent": {
                "Acknowledged",
                "Vendor Rejected",
            },

            "Acknowledged": {
                "Closed",
                "Cancelled",
            },

            "Vendor Rejected": {
                "Cancelled",
            },

            "Rejected": set(),

            "Closed": set(),

            "Cancelled": set(),
        }

        current_status = purchase_order.status

        allowed_statuses = allowed_transitions.get(
            current_status,
            set(),
        )

        if status not in allowed_statuses:
            raise ValueError(
                "Invalid Purchase Order status transition: "
                f"{current_status} -> {status}"
            )

        purchase_order.status = status

        self.db.commit()
        self.db.refresh(purchase_order)

        AuditService(self.db).log(
            user_id=user_id,
            action="STATUS_UPDATE",
            module="Purchase Order",
            status="SUCCESS",
            message=(
                f"Purchase Order {purchase_order.po_number} "
                f"status changed from "
                f"{current_status} to {status}."
            ),
        )

        return purchase_order

    # ==========================================================
    # Submit PO for Approval
    # ==========================================================

    def submit_for_approval(
        self,
        po_id: int,
        user_id: int,
    ) -> ProcurementPurchaseOrder:

        return self._transition(
            po_id=po_id,
            target_status="Pending Approval",
            user_id=user_id,
            action="SUBMIT",
            message="Purchase Order submitted for approval.",
        )

    # ==========================================================
    # Approve / Reject PO
    # ==========================================================

    def decide(
        self,
        po_id: int,
        user_id: int,
        decision: str,
        remarks: Optional[str],
    ) -> ProcurementPurchaseOrder:

        if decision not in {
            "Approved",
            "Rejected",
        }:
            raise ValueError(
                "Decision must be Approved or Rejected."
            )

        purchase_order = self._get_required(
            po_id
        )

        if purchase_order.status != "Pending Approval":
            raise ValueError(
                "Only Purchase Orders pending approval "
                "can be approved or rejected."
            )

        approval = PurchaseOrderApproval(
            purchase_order_id=purchase_order.id,
            reviewer_id=user_id,
            decision=decision,
            remarks=remarks,
        )

        self.db.add(approval)
        self.db.flush()

        return self._transition(
            po_id=po_id,
            target_status=decision,
            user_id=user_id,
            action=decision.upper(),
            message=(
                remarks
                or f"Purchase Order {decision.lower()}."
            ),
        )

    # ==========================================================
    # Send Approved PO to Vendor
    # ==========================================================

    def send_to_vendor(
        self,
        po_id: int,
        user_id: int,
    ) -> ProcurementPurchaseOrder:

        purchase_order = self._get_required(
            po_id
        )

        if purchase_order.status != "Approved":
            raise ValueError(
                "Only approved Purchase Orders "
                "can be sent to the vendor."
            )

        return self._transition(
            po_id=po_id,
            target_status="Sent",
            user_id=user_id,
            action="SEND_TO_VENDOR",
            message="Purchase Order sent to vendor.",
        )

    # ==========================================================
    # Record Vendor Response
    # ==========================================================

    def record_vendor_response(
        self,
        po_id: int,
        response: str,
        remarks: Optional[str],
        user_id: int,
    ) -> ProcurementPurchaseOrder:

        if response not in {
            "Vendor Accepted",
            "Vendor Rejected",
        }:
            raise ValueError(
                "Vendor response must be accepted or rejected."
            )

        purchase_order = self._get_required(
            po_id
        )

        if purchase_order.status != "Sent":
            raise ValueError(
                "Only sent Purchase Orders "
                "can receive a vendor response."
            )

        vendor_response = PurchaseOrderVendorResponse(
            purchase_order_id=purchase_order.id,
            response=response,
            remarks=remarks,
        )

        self.db.add(vendor_response)
        self.db.flush()

        if response == "Vendor Accepted":
            target_status = "Acknowledged"
            message = (
                "Vendor accepted the Purchase Order."
            )
        else:
            target_status = "Vendor Rejected"
            message = (
                "Vendor rejected the Purchase Order."
            )

        return self._transition(
            po_id=po_id,
            target_status=target_status,
            user_id=user_id,
            action="VENDOR_RESPONSE",
            message=remarks or message,
        )

    # ==========================================================
    # Internal Status Transition Helper
    # ==========================================================

    def _transition(
        self,
        po_id: int,
        target_status: str,
        user_id: int,
        action: str,
        message: str,
    ) -> ProcurementPurchaseOrder:

        purchase_order = self.update_status(
            po_id=po_id,
            status=target_status,
            user_id=user_id,
        )

        if purchase_order is None:
            raise ValueError(
                "Purchase Order not found."
            )

        AuditService(self.db).log(
            user_id=user_id,
            action=action,
            module="Purchase Order",
            status="SUCCESS",
            message=(
                f"Purchase Order "
                f"{purchase_order.po_number}: "
                f"{message}"
            ),
        )

        return purchase_order

    # ==========================================================
    # Delete Purchase Order
    # ==========================================================

    def delete_purchase_order(
        self,
        po_id: int,
    ) -> bool:

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == po_id
            )
            .first()
        )

        if purchase_order is None:
            return False

        self.db.delete(purchase_order)
        self.db.commit()

        return True

    # ==========================================================
    # Create PO from Approved PR
    # ==========================================================

    def create_from_approved_pr(
        self,
        pr_id: int,
        user_id: int,
    ) -> ProcurementPurchaseOrder:

        purchase_requisition = (
            self.db.query(PurchaseRequisition)
            .filter(
                PurchaseRequisition.id == pr_id
            )
            .first()
        )

        if purchase_requisition is None:
            raise ValueError(
                "Purchase Requisition not found."
            )

        if purchase_requisition.status != "Approved":
            raise ValueError(
                "Only approved Purchase Requisitions "
                "can create a Purchase Order."
            )

        if not purchase_requisition.selected_vendor_name:
            raise ValueError(
                "Select a vendor before creating "
                "the Purchase Order."
            )

        if purchase_requisition.negotiated_amount is None:
            raise ValueError(
                "Record the negotiated amount before "
                "creating the Purchase Order."
            )

        existing_po = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.purchase_requisition_id
                == purchase_requisition.id
            )
            .first()
        )

        if existing_po:
            raise ValueError(
                "A Purchase Order already exists "
                "for this Purchase Requisition."
            )

        po_number = (
            f"PO-{uuid.uuid4().hex[:8].upper()}"
        )

        purchase_order = ProcurementPurchaseOrder(
            po_number=po_number,
            purchase_requisition_id=purchase_requisition.id,
            vendor_name=purchase_requisition.selected_vendor_name,
            currency=purchase_requisition.currency,
            subtotal=purchase_requisition.negotiated_amount,
            tax=0,
            total_amount=purchase_requisition.negotiated_amount,
            status="Created",
            created_by_id=user_id,
        )

        self.db.add(purchase_order)
        self.db.flush()

        for item in purchase_requisition.line_items:

            purchase_order_line = ProcurementPurchaseOrderLine(
                purchase_order_id=purchase_order.id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                amount=item.amount,
            )

            self.db.add(purchase_order_line)

        self.db.commit()
        self.db.refresh(purchase_order)

        AuditService(self.db).log(
            user_id=user_id,
            action="CREATE",
            module="Purchase Order",
            status="SUCCESS",
            message=(
                f"Purchase Order "
                f"{purchase_order.po_number} "
                f"created from Purchase Requisition "
                f"{purchase_requisition.pr_number}."
            ),
        )

        return purchase_order