from sqlalchemy.orm import Session

from app.database.models import (
    Invoice,
    PORecord,
    InvoiceStatusLog
)


class MatchingService:
    """
    Service responsible for matching an Invoice
    with its corresponding Purchase Order.
    """

    def __init__(self, db: Session):
        self.db = db

    def match_invoice_with_po(
        self,
        invoice_id: int
    ) -> dict:

        # ---------------------------------------------
        # Get Invoice
        # ---------------------------------------------
        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            return {
                "success": False,
                "message": "Invoice not found."
            }

        # ---------------------------------------------
        # Get Purchase Order
        # ---------------------------------------------
        purchase_order = (
            self.db.query(PORecord)
            .filter(PORecord.invoice_id == invoice_id)
            .first()
        )

        if purchase_order is None:
            return {
                "success": False,
                "message": "Purchase Order not found."
            }

        # ---------------------------------------------
        # Compare Fields
        # ---------------------------------------------
        mismatches = []

        invoice_vendor = (
            invoice.vendor_name or ""
        ).replace("\n", " ").strip().lower()

        po_vendor = (
            purchase_order.vendor_name or ""
        ).replace("\n", " ").strip().lower()

        if invoice_vendor != po_vendor:
            mismatches.append("Vendor Name")

        invoice_customer = (
            invoice.customer_name or ""
        ).replace("\n", " ").strip().lower()

        po_customer = (
            purchase_order.customer_name or ""
        ).replace("\n", " ").strip().lower()

        if invoice_customer != po_customer:
            mismatches.append("Customer Name")

        invoice_currency = (
            invoice.currency or ""
        ).strip().upper()

        po_currency = (
            purchase_order.currency or ""
        ).strip().upper()

        if invoice_currency != po_currency:
            mismatches.append("Currency")


        if round(invoice.subtotal, 2) != round(purchase_order.subtotal, 2):
            mismatches.append("Subtotal")

        if round(invoice.tax, 2) != round(purchase_order.tax, 2):
            mismatches.append("Tax")

        if round(invoice.total_amount, 2) != round(purchase_order.total_amount, 2):
            mismatches.append("Total Amount")

        # ---------------------------------------------
        # Calculate Match Score
        # ---------------------------------------------
        total_checks = 6

        matched_checks = total_checks - len(mismatches)

        score = round((matched_checks / total_checks) * 100)

        is_match = len(mismatches) == 0

        # ---------------------------------------------
        # Update Invoice Status
        # ---------------------------------------------
        try:
            if is_match:
                invoice.processing_status = "Matched"
            else:
                invoice.processing_status = "Review Required"

            status_log = InvoiceStatusLog(
                invoice_id=invoice.id,
                status=invoice.processing_status,
                remarks=(
                    "Invoice matched successfully."
                    if is_match
                    else "Invoice requires manual review."
                ),
                updated_by="System"
            )

            self.db.add(status_log)
            self.db.commit()

        except Exception:
            self.db.rollback()
            raise

        # ---------------------------------------------
        # Response
        # ---------------------------------------------
        return {
            "success": True,
            "invoice_id": invoice.id,
            "po_number": purchase_order.po_number,
            "is_match": is_match,
            "match_score": score,
            "mismatches": mismatches,
            "status": invoice.processing_status,
            "message": (
                "Invoice successfully matched with Purchase Order."
                if is_match
                else "Invoice matched with mismatches."
            )
        }