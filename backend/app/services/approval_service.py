from sqlalchemy.orm import Session

from app.database.models import (
    Invoice,
    InvoiceStatusLog,
    ApprovalHistory,
)
from app.services.purchase_order_service import PurchaseOrderService
from app.services.audit_service import AuditService


class ApprovalService:

    def __init__(self, db: Session):
        self.db = db
        self.purchase_order_service = PurchaseOrderService(db)
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
    # Approve Invoice
    # ======================================================
    def approve_invoice(
        self,
        invoice_id: int,
        approved_by: str,
        user_id: int
    ):

        invoice = self.get_invoice(invoice_id)

        if invoice is None:
            return None

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

        #
        # Automatically Create Purchase Order
        #
        if not self.purchase_order_service.get_purchase_order_by_invoice(
            invoice.id
        ):

            self.purchase_order_service.generate_purchase_order(
                invoice.id
            )
            invoice.processing_status = "PO Completed"

        status_log = InvoiceStatusLog(
            invoice_id=invoice.id,
            status="PO Completed",
            remarks="Purchase Order generated successfully.",
            updated_by=approved_by
        )

        self.db.add(status_log)

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