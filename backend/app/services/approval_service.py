from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import (
    Invoice,
    InvoiceLineItem,
    InvoiceStatusLog,
    ApprovalHistory,
)
from app.services.audit_service import AuditService
from app.services.currency_service import convert_invoice_amounts_to_usd, to_usd


class ApprovalService:

    def __init__(self, db: Session):
        self.db = db
        self.audit_service = AuditService(db)

    # ======================================================
    # Get Pending Approvals
    # ======================================================
    def get_pending_invoices(self):

        return (
            self.db.query(Invoice)
            .filter(
                Invoice.processing_status == "Approval Pending"
            )
            .all()
        )

    # ======================================================
    # Get Invoice
    # ======================================================
    def get_invoice(self, invoice_id: int):

        return (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

    # ======================================================
    # Apply edits made during approval
    # ======================================================
    def apply_invoice_edits(self, invoice: Invoice, edits) -> None:
        if edits is None:
            return

        source_currency = getattr(edits, "currency", None) or invoice.currency or "USD"

        header_map = {
            "invoice_number": getattr(edits, "invoice_number", None),
            "vendor_name": getattr(edits, "vendor_name", None),
            "vendor_address": getattr(edits, "vendor_address", None),
            "customer_name": getattr(edits, "customer_name", None),
            "invoice_date": getattr(edits, "invoice_date", None),
            "due_date": getattr(edits, "due_date", None),
            "purchase_order_number": getattr(edits, "purchase_order_number", None),
            "currency": "USD",
            "subtotal": getattr(edits, "subtotal", None),
            "tax": getattr(edits, "tax", None),
            "total_amount": getattr(edits, "total_amount", None),
        }

        converted = convert_invoice_amounts_to_usd(
            {
                "currency": source_currency,
                "subtotal": header_map["subtotal"]
                if header_map["subtotal"] is not None
                else invoice.subtotal,
                "tax": header_map["tax"] if header_map["tax"] is not None else invoice.tax,
                "total_amount": header_map["total_amount"]
                if header_map["total_amount"] is not None
                else invoice.total_amount,
                "line_items": [],
            }
        )

        for field, value in header_map.items():
            if field in {"subtotal", "tax", "total_amount"}:
                continue
            if value is not None:
                setattr(invoice, field, value)

        invoice.currency = "USD"
        invoice.subtotal = converted["subtotal"]
        invoice.tax = converted["tax"]
        invoice.total_amount = converted["total_amount"]

        if not edits.line_items:
            return

        line_by_id = {item.id: item for item in invoice.line_items}

        for line_edit in edits.line_items:
            line: Optional[InvoiceLineItem] = line_by_id.get(line_edit.id)
            if line is None:
                continue

            if line_edit.description is not None:
                line.description = line_edit.description
            if line_edit.quantity is not None:
                line.quantity = line_edit.quantity
            if line_edit.unit_price is not None:
                line.unit_price = to_usd(line_edit.unit_price, source_currency)
            if line_edit.amount is not None:
                line.amount = to_usd(line_edit.amount, source_currency)
            elif line.quantity is not None and line.unit_price is not None:
                line.amount = float(line.quantity) * float(line.unit_price)

    # ======================================================
    # Check whether actual invoice edits exist
    # ======================================================
    def has_invoice_edits(self, edits) -> bool:
        if edits is None:
            return False

        header_fields = [
            "invoice_number",
            "vendor_name",
            "vendor_address",
            "customer_name",
            "invoice_date",
            "due_date",
            "purchase_order_number",
            "currency",
            "subtotal",
            "tax",
            "total_amount",
        ]

        for field in header_fields:
            if getattr(edits, field, None) is not None:
                return True

        return bool(getattr(edits, "line_items", None))

    # ======================================================
    # Approve Invoice
    # ======================================================
    def approve_invoice(
        self,
        invoice_id: int,
        approved_by: str,
        user_id: int,
        invoice_edits=None,
    ):

        invoice = self.get_invoice(invoice_id)

        if invoice is None:
            return None

        if invoice.procurement_purchase_order_id is None:
            raise ValueError("Link the invoice to a Purchase Order before approval.")
        if invoice.processing_status != "Approval Pending":
            raise ValueError(
                "Only successfully matched invoices sent for approval can be approved."
            )

        # A financial edit invalidates the previous match.  It is saved for
        # review, but the invoice must be matched again before approval.
        if self.has_invoice_edits(invoice_edits):
            self.apply_invoice_edits(invoice, invoice_edits)

            invoice.processing_status = "Review Required"

            self.db.add(
                InvoiceStatusLog(
                    invoice_id=invoice.id,
                    status="Review Required",
                    remarks=(
                        "Invoice values changed during approval. "
                        "Run 2-way matching again."
                    ),
                    updated_by=approved_by,
                )
            )

            self.db.commit()

            raise ValueError(
                "Invoice values were updated. "
                "Run 2-way matching again before approval."
            )

        invoice.processing_status = "Approved"

        status_log = InvoiceStatusLog(
            invoice_id=invoice.id,
            status="Approved",
            remarks="Invoice approved successfully.",
            updated_by=approved_by
        )

        self.db.add(status_log)
        approval = ApprovalHistory(
            invoice_id=invoice.id,
            reviewer=approved_by,
            decision="Approved",
            remarks="Invoice approved successfully."
        )

        self.db.add(approval)

        payment_status_log = InvoiceStatusLog(
            invoice_id=invoice.id,
            status="Payment Pending",
            remarks="Invoice approved and ready for payment processing.",
            updated_by=approved_by
        )

        self.db.add(payment_status_log)
        invoice.processing_status = "Payment Pending"

        self.db.commit()

        self.db.refresh(invoice)

        self.audit_service.log(
            user_id=user_id,
            action="Approved Invoice",
            module="Approval",
            status="Success",
            message=f"Invoice {invoice.invoice_number} approved by {approved_by}"
        )

        return invoice

    
    # ======================================================
    # Reject Invoice
    # ======================================================
    def reject_invoice(
        self,
        invoice_id: int,
        rejected_by: str,
        reason: str,
        user_id: int
    ):

        invoice = self.get_invoice(invoice_id)

        if invoice is None:
            return None

        print("Approval invoice ID:", invoice.id)
        print("Approval invoice status:", repr(invoice.processing_status))

        invoice.processing_status = "Rejected"

        status_log = InvoiceStatusLog(
            invoice_id=invoice.id,
            status="Rejected",
            remarks=reason,
            updated_by=rejected_by
        )

        self.db.add(status_log)

        approval = ApprovalHistory(
            invoice_id=invoice.id,
            reviewer=rejected_by,
            decision="Rejected",
            remarks=reason
        )

        self.db.add(approval)

        self.db.commit()

        self.db.refresh(invoice)

        self.audit_service.log(
            user_id=user_id,
            action="Rejected Invoice",
            module="Approval",
            status="Success",
            message=f"Invoice {invoice.invoice_number} rejected by {rejected_by}. Reason: {reason}"
        )

        return invoice

    # ======================================================
    # Approval History
    # ======================================================
    def get_history(
        self,
        invoice_id: int
    ):

        history = (
            self.db.query(ApprovalHistory)
            .filter(
                ApprovalHistory.invoice_id == invoice_id
            )
            .order_by(
                ApprovalHistory.approved_at.desc()
            )
            .all()
        )

        print("History Count:", len(history))

        return history
