from datetime import datetime
from typing import Optional, List

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.database.models import (
    PurchaseRequisition,
    ProcurementPurchaseOrder,
    ProcurementPurchaseOrderLine,
    PurchaseOrderApproval,
    PurchaseOrderVendorResponse,
    GoodsReceipt,
    GoodsReceiptLine,
    Invoice,
)

from app.services.audit_service import AuditService
from app.services.currency_service import (
    convert_invoice_amounts_to_usd,
)
from app.services.purchase_requisition_service import (
    PurchaseRequisitionService,
)

PRE_SEND_PO_STATUSES = {
    "Created",
    "Pending Approval",
    "Approved",
}


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

    @staticmethod
    def _normalize_vendor(vendor_name: str | None) -> str:
        return (vendor_name or "").strip().lower()

    @staticmethod
    def _line_item_signature(line_items: list) -> list[tuple]:
        """
        Stable signature for duplicate comparison:
        description + quantity + unit_price.
        """
        signature = []

        for item in line_items or []:
            if isinstance(item, dict):
                description = item.get("description")
                quantity = item.get("quantity", 0)
                unit_price = item.get("unit_price", 0)
            else:
                description = getattr(item, "description", None)
                quantity = getattr(item, "quantity", 0)
                unit_price = getattr(item, "unit_price", 0)

            signature.append(
                (
                    (description or "").strip().lower(),
                    round(float(quantity or 0), 4),
                    round(float(unit_price or 0), 4),
                )
            )

        return sorted(signature)

    def _find_duplicate_pre_send_po(
        self,
        *,
        business_need_id: int,
        vendor_name: str | None,
        total_amount: float,
        line_items: list,
    ) -> ProcurementPurchaseOrder | None:
        """
        Duplicate when same BN + vendor + amount + line items
        and existing PO is not yet sent to vendor.
        If any of those differ, returns None (flow continues).
        """
        proposed_vendor = self._normalize_vendor(vendor_name)
        proposed_lines = self._line_item_signature(line_items)
        proposed_total = round(float(total_amount or 0), 2)

        candidates = (
            self.db.query(ProcurementPurchaseOrder)
            .options(
                joinedload(ProcurementPurchaseOrder.line_items)
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.business_need_id
                == business_need_id,
                func.round(
                    ProcurementPurchaseOrder.total_amount,
                    2,
                )
                == proposed_total,
                ProcurementPurchaseOrder.status.in_(
                    PRE_SEND_PO_STATUSES
                ),
            )
            .all()
        )

        for candidate in candidates:
            if self._normalize_vendor(
                candidate.vendor_name
            ) != proposed_vendor:
                continue

            if self._line_item_signature(
                candidate.line_items
            ) != proposed_lines:
                continue

            return candidate

        return None

    # ==========================================================
    # Validate Purchase Order Ownership
    # ==========================================================

    def _get_required(
        self,
        po_id: int,
        user_id: int | None = None,
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

        if (
            user_id is not None
            and purchase_order.created_by_id != user_id
        ):
            raise ValueError(
                "You do not have permission to access this Purchase Order."
            )

        return purchase_order

    # ==========================================================
    # Get Purchase Order by Number
    # ==========================================================

    def get_purchase_order_by_number(
        self,
        po_number: str,
        user_id: int,
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
                ProcurementPurchaseOrder.po_number == po_number,
                ProcurementPurchaseOrder.created_by_id == user_id,
            )
            .first()
    )
    # ==========================================================
    # Get All Purchase Orders
    # ==========================================================

    def get_all_purchase_orders(
        self,
        user_id: int,
    ) -> List[ProcurementPurchaseOrder]:

        return (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.created_by_id == user_id,
            )
            .order_by(
                ProcurementPurchaseOrder.id.desc()
            )
            .all()
        )

    # ==========================================================
    # Purchase Order Status Transition
    # ==========================================================

    def update_status(
        self,
        po_id: int,
        status: str,
        user_id: int,
    ) -> Optional[ProcurementPurchaseOrder]:

        purchase_order = self._get_required(
            po_id=po_id,
            user_id=user_id,
        )

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
    # Close eligibility: Matched+Paid + Valid GR
    # Order of GR vs payment does not matter.
    # ==========================================================

    def is_po_fully_received(
        self,
        purchase_order_id: int,
    ) -> bool:
        po_lines = (
            self.db.query(ProcurementPurchaseOrderLine)
            .filter(
                ProcurementPurchaseOrderLine.purchase_order_id
                == purchase_order_id
            )
            .all()
        )

        if not po_lines:
            return False

        for po_line in po_lines:
            gr_lines = (
                self.db.query(GoodsReceiptLine)
                .join(GoodsReceipt)
                .filter(
                    GoodsReceipt.purchase_order_id
                    == purchase_order_id,
                    GoodsReceiptLine.purchase_order_line_id
                    == po_line.id,
                    GoodsReceipt.status == "Accepted",
                )
                .all()
            )

            total_received = sum(
                float(
                    (line.accepted_quantity or 0)
                    or (line.received_quantity or 0)
                )
                for line in gr_lines
            )

            if total_received < float(po_line.quantity or 0):
                return False

        return True

    def has_matched_and_paid_invoice(
        self,
        purchase_order: ProcurementPurchaseOrder,
    ) -> bool:
        """
        Paid implies match + approval completed in this app.
        """
        invoices = (
            self.db.query(Invoice)
            .filter(
                Invoice.procurement_purchase_order_id
                == purchase_order.id
            )
            .all()
        )

        if not invoices:
            invoices = (
                self.db.query(Invoice)
                .filter(
                    Invoice.purchase_order_number
                    == purchase_order.po_number
                )
                .all()
            )

        return any(
            inv.processing_status == "Paid"
            for inv in invoices
        )

    def try_close_purchase_order(
        self,
        purchase_order_id: int,
    ) -> bool:
        """
        Close PO when:
            Matched + Payment Completed + Valid Accepted GR
        Caller is responsible for commit.
        """
        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id
                == purchase_order_id
            )
            .first()
        )

        if purchase_order is None:
            return False

        if purchase_order.status != "Acknowledged":
            return False

        if not self.has_matched_and_paid_invoice(
            purchase_order
        ):
            return False

        if not self.is_po_fully_received(
            purchase_order.id
        ):
            return False

        purchase_order.status = "Closed"
        return True

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
            po_id,
            user_id=user_id,
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
            po_id,
            user_id=user_id,
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
            po_id,
            user_id=user_id,
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
        user_id: int,
    ) -> bool:

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == po_id,
                ProcurementPurchaseOrder.created_by_id == user_id,
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
                PurchaseRequisition.id == pr_id,
                PurchaseRequisition.requester_id == user_id,
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

        # Block another PO on this PR until existing ones are
        # sent to vendor (or cancelled / rejected).
        blocking_po = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.purchase_requisition_id
                == purchase_requisition.id,
                ProcurementPurchaseOrder.status.in_(
                    PRE_SEND_PO_STATUSES
                ),
            )
            .first()
        )

        if blocking_po:
            raise ValueError(
                "A Purchase Order already exists for this "
                f"Purchase Requisition ({blocking_po.po_number}) "
                "and has not been sent to the vendor yet. "
                "Send it to the vendor (or cancel/reject it) "
                "before creating another PO."
            )

        user_po_count = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.created_by_id
                == user_id
            )
            .count()
        )

        po_number = (
            f"PO-U{user_id}-{(user_po_count + 1):05d}"
        )

        # ==========================================================
        # Convert Purchase Requisition amounts to USD
        # ==========================================================

        original_currency = (
            purchase_requisition.currency or "USD"
        ).strip().upper()

        negotiated_total = float(
            purchase_requisition.negotiated_amount or 0
        )

        # Prorate original line unit prices by negotiated /
        # original so qty × unit_price sums to negotiated total.
        prorated_lines = (
            PurchaseRequisitionService._prorate_negotiated_lines(
                purchase_requisition.line_items,
                negotiated_total,
            )
        )

        conversion_data = {
            "currency": original_currency,
            "subtotal": negotiated_total,
            "tax": 0,
            "total_amount": negotiated_total,
            "line_items": prorated_lines,
        }

        converted_data = convert_invoice_amounts_to_usd(
            conversion_data
        )

        # ==========================================================
        # Duplicate = same BN + vendor + amount + line items
        # while PO is still pre-send. Otherwise continue normally.
        # ==========================================================

        duplicate_po = self._find_duplicate_pre_send_po(
            business_need_id=(
                purchase_requisition.business_need_id
            ),
            vendor_name=(
                purchase_requisition.selected_vendor_name
            ),
            total_amount=float(
                converted_data["total_amount"] or 0
            ),
            line_items=converted_data.get("line_items") or [],
        )

        if duplicate_po:
            raise ValueError(
                "Duplicate Purchase Order detected. "
                f"PO {duplicate_po.po_number} already exists "
                "for this Business Need with the same vendor, "
                "value, and line items, and has not been sent "
                "to the vendor yet."
            )

        # ==========================================================
        # Create Purchase Order in USD
        # ==========================================================

        purchase_order = ProcurementPurchaseOrder(
            po_number=po_number,
            purchase_requisition_id=purchase_requisition.id,
            vendor_name=purchase_requisition.selected_vendor_name,

            # PO is normalized to USD
            currency="USD",

            subtotal=converted_data["subtotal"],
            tax=converted_data["tax"],
            total_amount=converted_data["total_amount"],

            status="Created",
            created_by_id=user_id,
        )

        self.db.add(purchase_order)
        self.db.flush()

        for item in converted_data["line_items"]:

            purchase_order_line = ProcurementPurchaseOrderLine(
                purchase_order_id=purchase_order.id,
                description=item.get("description"),
                quantity=item.get("quantity", 0),
                unit_price=item.get("unit_price", 0),
                amount=item.get("amount", 0),
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