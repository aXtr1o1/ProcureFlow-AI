from datetime import datetime

from sqlalchemy.orm import Session

from app.database.models import (
    Invoice,
    InvoiceException,
    InvoiceMatchMismatch,
    InvoiceMatchRun,
    InvoiceStatusLog,
    ProcurementPurchaseOrder,
    ProcurementPurchaseOrderLine,
    InvoiceLineItem,
)


class MatchingService:
    """
    Service responsible for matching an Invoice
    with its procurement Purchase Order.

    New procurement workflow:

        Invoice
            ↓
        Procurement Purchase Order
            ↓
        PO Lines
            ↓
        Invoice Lines
            ↓
        Invoice Match Run
            ↓
        Matched / Review Required
            ↓
        Approval
    """

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================
    # Match Invoice with Procurement Purchase Order
    # ==========================================================

    def match_invoice_with_po(
        self,
        invoice_id: int,
        performed_by_id: int | None = None,
    ) -> dict:

        # ------------------------------------------------------
        # Get Invoice
        # ------------------------------------------------------

        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            return {
                "success": False,
                "message": "Invoice not found.",
            }

        # ------------------------------------------------------
        # Invoice must be linked to procurement PO
        # ------------------------------------------------------

        if invoice.procurement_purchase_order_id is None:
            return {
                "success": False,
                "message": (
                    "Link the invoice to a procurement Purchase Order "
                    "before matching."
                ),
            }

        # ------------------------------------------------------
        # Get Procurement Purchase Order
        # ------------------------------------------------------

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id
                == invoice.procurement_purchase_order_id
            )
            .first()
        )

        if purchase_order is None:
            return {
                "success": False,
                "message": "Linked procurement Purchase Order not found.",
            }

        # ------------------------------------------------------
        # Validate PO Status
        # ------------------------------------------------------

        if purchase_order.status in {"Cancelled", "Closed"}:
            return {
                "success": False,
                "message": (
                    f"Purchase Order {purchase_order.po_number} "
                    f"cannot be matched in its "
                    f"{purchase_order.status} status."
                ),
            }

        # ------------------------------------------------------
        # Collect Mismatches
        # ------------------------------------------------------

        mismatches: list[tuple[str, object, object]] = []

        # ------------------------------------------------------
        # Vendor
        # ------------------------------------------------------

        invoice_vendor = (
            invoice.vendor_name or ""
        ).replace("\n", " ").strip().lower()

        po_vendor = (
            purchase_order.vendor_name or ""
        ).replace("\n", " ").strip().lower()

        if invoice_vendor != po_vendor:
            mismatches.append(
                (
                    "Vendor Name",
                    purchase_order.vendor_name,
                    invoice.vendor_name,
                )
            )

        # ------------------------------------------------------
        # Currency
        # ------------------------------------------------------

        invoice_currency = (
            invoice.currency or ""
        ).strip().upper()

        po_currency = (
            purchase_order.currency or ""
        ).strip().upper()

        if invoice_currency != po_currency:
            mismatches.append(
                (
                    "Currency",
                    purchase_order.currency,
                    invoice.currency,
                )
            )

        # ------------------------------------------------------
        # Subtotal
        # ------------------------------------------------------

        if round(invoice.subtotal or 0, 2) != round(
            purchase_order.subtotal or 0,
            2,
        ):
            mismatches.append(
                (
                    "Subtotal",
                    purchase_order.subtotal,
                    invoice.subtotal,
                )
            )

        # ------------------------------------------------------
        # Tax
        # ------------------------------------------------------

        if round(invoice.tax or 0, 2) != round(
            purchase_order.tax or 0,
            2,
        ):
            mismatches.append(
                (
                    "Tax",
                    purchase_order.tax,
                    invoice.tax,
                )
            )

        # ------------------------------------------------------
        # Total Amount
        # ------------------------------------------------------

        if round(invoice.total_amount or 0, 2) != round(
            purchase_order.total_amount or 0,
            2,
        ):
            mismatches.append(
                (
                    "Total Amount",
                    purchase_order.total_amount,
                    invoice.total_amount,
                )
            )

        # ======================================================
        # Line-Level Matching
        # ======================================================

        po_lines = (
            self.db.query(ProcurementPurchaseOrderLine)
            .filter(
                ProcurementPurchaseOrderLine.purchase_order_id
                == purchase_order.id
            )
            .all()
        )

        invoice_lines = (
            self.db.query(InvoiceLineItem)
            .filter(
                InvoiceLineItem.invoice_id
                == invoice.id
            )
            .all()
        )

        if len(po_lines) != len(invoice_lines):
            mismatches.append(
                (
                    "Line Item Count",
                    len(po_lines),
                    len(invoice_lines),
                )
            )

        # ------------------------------------------------------
        # Compare line items
        #
        # Matching is performed by description.
        # ------------------------------------------------------

        invoice_line_map = {}

        for line in invoice_lines:
            key = (
                line.description or ""
            ).strip().lower()

            invoice_line_map[key] = line

        for po_line in po_lines:

            key = (
                po_line.description or ""
            ).strip().lower()

            invoice_line = invoice_line_map.get(key)

            if invoice_line is None:
                mismatches.append(
                    (
                        f"Line Item: {po_line.description}",
                        "Present",
                        "Missing",
                    )
                )
                continue

            # Quantity
            if round(
                po_line.quantity or 0,
                2,
            ) != round(
                invoice_line.quantity or 0,
                2,
            ):
                mismatches.append(
                    (
                        f"Quantity: {po_line.description}",
                        po_line.quantity,
                        invoice_line.quantity,
                    )
                )

            # Unit Price
            if round(
                po_line.unit_price or 0,
                2,
            ) != round(
                invoice_line.unit_price or 0,
                2,
            ):
                mismatches.append(
                    (
                        f"Unit Price: {po_line.description}",
                        po_line.unit_price,
                        invoice_line.unit_price,
                    )
                )

            # Amount
            if round(
                po_line.amount or 0,
                2,
            ) != round(
                invoice_line.amount or 0,
                2,
            ):
                mismatches.append(
                    (
                        f"Amount: {po_line.description}",
                        po_line.amount,
                        invoice_line.amount,
                    )
                )

        # ======================================================
        # Match Score
        # ======================================================

        total_checks = 5

        if po_lines or invoice_lines:
            total_checks += 1

        total_checks = max(total_checks, 1)

        matched_checks = max(
            total_checks - len(mismatches),
            0,
        )

        score = round(
            (matched_checks / total_checks) * 100
        )

        is_match = len(mismatches) == 0

        exception_id = None

        # ======================================================
        # Database Transaction
        # ======================================================

        try:

            # --------------------------------------------------
            # Create Match Run
            # --------------------------------------------------

            match_run = InvoiceMatchRun(
                invoice_id=invoice.id,
                purchase_order_id=purchase_order.id,
                performed_by_id=performed_by_id,
                status=(
                    "Matched"
                    if is_match
                    else "Review Required"
                ),
                match_score=score,
            )

            self.db.add(match_run)

            self.db.flush()

            # --------------------------------------------------
            # Save Mismatches
            # --------------------------------------------------

            for (
                field_name,
                po_value,
                invoice_value,
            ) in mismatches:

                mismatch = InvoiceMatchMismatch(
                    match_run_id=match_run.id,
                    field_name=field_name,
                    po_value=str(po_value),
                    invoice_value=str(invoice_value),
                )

                self.db.add(mismatch)

            # ==================================================
            # Successful Match
            # ==================================================

            if is_match:

                invoice.processing_status = "Approval Pending"

                # ----------------------------------------------
                # Resolve existing open exception
                # ----------------------------------------------

                open_exception = (
                    self.db.query(InvoiceException)
                    .filter(
                        InvoiceException.invoice_id == invoice.id,
                        InvoiceException.status == "Open",
                    )
                    .all()
                )

                for exception in open_exception:

                    exception.status = "Resolved"

                    exception.resolution_remarks = (
                        "Automatically resolved by "
                        "a successful re-match."
                    )

                    exception.resolved_by_id = performed_by_id
                    exception.resolved_at = datetime.utcnow()

                # ----------------------------------------------
                # Status Log
                # ----------------------------------------------

                self.db.add(
                    InvoiceStatusLog(
                        invoice_id=invoice.id,
                        status="Approval Pending",
                        remarks=(
                            "Invoice successfully matched with "
                            "Purchase Order. Awaiting invoice approval."
                        ),
                        updated_by="System",
                    )
                )

            # ==================================================
            # Match Failed / Review Required
            # ==================================================

            else:

                invoice.processing_status = (
                    "Review Required"
                )

                # ----------------------------------------------
                # Check existing open exception
                # ----------------------------------------------

                existing_exception = (
                    self.db.query(InvoiceException)
                    .filter(
                        InvoiceException.invoice_id
                        == invoice.id,
                        InvoiceException.status
                        == "Open",
                    )
                    .first()
                )

                if existing_exception is None:

                    exception = InvoiceException(
                        invoice_id=invoice.id,
                        purchase_order_id=purchase_order.id,
                        match_run_id=match_run.id,
                        status="Open",
                    )

                    self.db.add(exception)

                    self.db.flush()

                    exception_id = exception.id

                else:

                    # Reuse existing open exception
                    existing_exception.match_run_id = (
                        match_run.id
                    )

                    exception_id = (
                        existing_exception.id
                    )

                # ----------------------------------------------
                # Status Log
                # ----------------------------------------------

                self.db.add(
                    InvoiceStatusLog(
                        invoice_id=invoice.id,
                        status="Review Required",
                        remarks=(
                            "Invoice matching completed with "
                            "mismatches. Manual review required."
                        ),
                        updated_by="System",
                    )
                )

            # --------------------------------------------------
            # Commit
            # --------------------------------------------------

            self.db.commit()

            self.db.refresh(invoice)
            self.db.refresh(match_run)

        except Exception:
            self.db.rollback()
            raise

        # ======================================================
        # Response
        # ======================================================

        return {
            "success": True,
            "invoice_id": invoice.id,
            "po_number": purchase_order.po_number,
            "is_match": is_match,
            "match_score": score,
            "mismatches": [
                {
                    "field_name": mismatch[0],
                    "po_value": (
                        str(mismatch[1])
                        if mismatch[1] is not None
                        else None
                    ),
                    "invoice_value": (
                        str(mismatch[2])
                        if mismatch[2] is not None
                        else None
                    ),
                }
                for mismatch in mismatches
            ],
            "status": invoice.processing_status,
            "match_run_id": match_run.id,
            "exception_id": exception_id,
            "message": (
                "Invoice successfully matched "
                "with Purchase Order."
                if is_match
                else "Invoice matched with mismatches."
            ),
        }

    # ==========================================================
    # Approve Match Override
    # ==========================================================

    def approve_match_override(
        self,
        invoice_id: int,
        performed_by_id: int | None = None,
        remarks: str | None = None,
    ):
        """
        Approve the matching exception and send the invoice
        to the normal invoice approval workflow.
        """

        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            raise ValueError("Invoice not found.")

        if invoice.processing_status != "Review Required":
            raise ValueError(
                "Only invoices requiring manual review can be "
                "approved after matching."
            )

        invoice.processing_status = "Approval Pending"

        self.db.add(
            InvoiceStatusLog(
                invoice_id=invoice.id,
                status="Approval Pending",
                remarks=(
                    remarks
                    or "Invoice mismatch manually approved. "
                    "Invoice is now awaiting invoice approval."
                ),
                updated_by="System",
            )
        )

        self.db.commit()
        self.db.refresh(invoice)

        return invoice

    # ==========================================================
    # Reject Invoice During Match Review
    # ==========================================================

    def reject_invoice_match(
        self,
        invoice_id: int,
        performed_by_id: int | None = None,
        remarks: str | None = None,
    ):
        """
        Reject an invoice during manual match review.

        A rejected invoice must not proceed to approval
        or payment.
        """

        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            raise ValueError("Invoice not found.")

        if invoice.processing_status != "Review Required":
            raise ValueError(
                "Only invoices requiring manual review can be rejected."
            )

        invoice.processing_status = "Rejected"

        # Resolve the open matching exception
        open_exception = (
            self.db.query(InvoiceException)
            .filter(
                InvoiceException.invoice_id == invoice.id,
                InvoiceException.status == "Open",
            )
            .first()
        )

        if open_exception is not None:
            open_exception.status = "Resolved"
            open_exception.resolution_remarks = (
                remarks or "Invoice rejected during manual match review."
            )
            open_exception.resolved_by_id = performed_by_id
            open_exception.resolved_at = datetime.utcnow()

        self.db.add(
            InvoiceStatusLog(
                invoice_id=invoice.id,
                status="Rejected",
                remarks=(
                    remarks
                    or "Invoice rejected during manual match review. "
                    "Invoice will not proceed to payment."
                ),
                updated_by="System",
            )
        )

        self.db.commit()
        self.db.refresh(invoice)

        return invoice