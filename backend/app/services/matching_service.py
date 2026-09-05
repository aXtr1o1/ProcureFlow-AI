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
from app.services.currency_service import convert_invoice_amounts_to_usd


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
    # Flexible Line Description Matching
    # ==========================================================

    @staticmethod
    def descriptions_match(
        description_1: str | None,
        description_2: str | None,
    ) -> bool:
        first = " ".join(
            (description_1 or "").strip().lower().split()
        )

        second = " ".join(
            (description_2 or "").strip().lower().split()
        )

        if not first or not second:
            return False

        # Exact match
        if first == second:
            return True

        # One description contains the other
        if first in second or second in first:
            return True

        # Match using common meaningful words
        first_words = set(first.split())
        second_words = set(second.split())

        common_words = first_words.intersection(second_words)

        return len(common_words) >= 2

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
        #
        # Invoice amounts are already stored in USD during upload.
        # Convert the PO monetary values to USD before matching.
        # ------------------------------------------------------

        po_currency = (
            purchase_order.currency or "USD"
        ).strip().upper()

        po_usd_data = convert_invoice_amounts_to_usd(
            {
                "currency": po_currency,
                "subtotal": purchase_order.subtotal or 0,
                "tax": purchase_order.tax or 0,
                "total_amount": purchase_order.total_amount or 0,
                "line_items": [],
            }
        )

        po_subtotal_usd = po_usd_data.get(
            "subtotal",
            purchase_order.subtotal or 0,
        )

        po_tax_usd = po_usd_data.get(
            "tax",
            purchase_order.tax or 0,
        )

        po_total_usd = po_usd_data.get(
            "total_amount",
            purchase_order.total_amount or 0,
        )

        # ------------------------------------------------------
        # Amount Excluding Tax
        #
        # Tax is excluded from the actual 2-way match.
        # The invoice total includes vendor-applied tax, so
        # calculate the invoice amount excluding tax.
        # ------------------------------------------------------

        invoice_amount_excluding_tax = round(
            (invoice.total_amount or 0) - (invoice.tax or 0),
            2,
        )

        amount_difference = abs(
            round(invoice_amount_excluding_tax or 0, 2)
            - round(po_total_usd or 0, 2)
        )

        if amount_difference > 0.05:
            mismatches.append(
                (
                    "Amount Excluding Tax",
                    po_total_usd,
                    invoice_amount_excluding_tax,
                )
            )

        # ------------------------------------------------------
        # Amount Including Tax
        #
        # This value is displayed for information only.
        # Vendor-applied tax must not cause a match failure.
        # ------------------------------------------------------

        invoice_amount_including_tax = round(
            invoice.total_amount or 0,
            2,
        )

        po_amount_including_tax = round(
            po_total_usd or 0,
            2,
        )

        matched_details = [
            {
                "field_name": "Vendor",
                "po_value": purchase_order.vendor_name,
                "invoice_value": invoice.vendor_name,
            },
            {
                "field_name": "Currency",
                "po_value": "USD",
                "invoice_value": "USD",
            },
            {
                "field_name": "Amount Excluding Tax",
                "po_value": round(po_total_usd or 0, 2),
                "invoice_value": round(
                    invoice_amount_excluding_tax or 0,
                    2,
                ),
            },
            {
                "field_name": "Amount Including Tax",
                "po_value": round(
                    po_amount_including_tax or 0,
                    2,
                ),
                "invoice_value": round(
                    invoice_amount_including_tax or 0,
                    2,
                ),
            },
            {
                "field_name": "Tax",
                "po_value": round(po_tax_usd or 0, 2),
                "invoice_value": round(invoice.tax or 0, 2),
                "excluded_from_matching": True,
            },
        ]

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
        # Each invoice line can be used only once.
        # ------------------------------------------------------

        used_invoice_line_ids = set()

        for po_line in po_lines:
            invoice_line = next(
                (
                    line
                    for line in invoice_lines
                    if line.id not in used_invoice_line_ids
                    and self.descriptions_match(
                        po_line.description,
                        line.description,
                    )
                ),
                None,
            )

            if invoice_line is None:
                mismatches.append(
                    (
                        f"Line Item: {po_line.description}",
                        "Present",
                        "Missing",
                    )
                )
                continue

            # Mark this invoice line as already matched
            used_invoice_line_ids.add(invoice_line.id)

            # --------------------------------------------------
            # Quantity
            # --------------------------------------------------

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

            # --------------------------------------------------
            # Unit Price - compare in USD
            # --------------------------------------------------

            po_line_usd = convert_invoice_amounts_to_usd(
                {
                    "currency": po_currency,
                    "subtotal": 0,
                    "tax": 0,
                    "total_amount": 0,
                    "line_items": [
                        {
                            "description": po_line.description,
                            "quantity": po_line.quantity or 0,
                            "unit_price": po_line.unit_price or 0,
                            "amount": po_line.amount or 0,
                        }
                    ],
                }
            )

            converted_line = (
                po_line_usd.get("line_items", [{}])[0]
            )

            po_unit_price_usd = converted_line.get(
                "unit_price",
                po_line.unit_price or 0,
            )

            po_amount_usd = converted_line.get(
                "amount",
                po_line.amount or 0,
            )

            unit_price_difference = abs(
                round(po_unit_price_usd or 0, 2)
                - round(invoice_line.unit_price or 0, 2)
            )

            if unit_price_difference > 0.05:
                mismatches.append(
                    (
                        f"Unit Price: {po_line.description}",
                        po_unit_price_usd,
                        invoice_line.unit_price,
                    )
                )

            # --------------------------------------------------
            # Amount - compare in USD
            # --------------------------------------------------

            line_amount_difference = abs(
                round(po_amount_usd or 0, 2)
                - round(invoice_line.amount or 0, 2)
            )

            if line_amount_difference > 0.05:
                mismatches.append(
                    (
                        f"Amount: {po_line.description}",
                        po_amount_usd,
                        invoice_line.amount,
                    )
                )

            matched_details.append(
                {
                    "field_name": (
                        f"Line Item: {po_line.description}"
                    ),
                    "po_value": {
                        "quantity": po_line.quantity,
                        "unit_price": round(
                            po_unit_price_usd or 0,
                            2,
                        ),
                        "amount": round(
                            po_amount_usd or 0,
                            2,
                        ),
                    },
                    "invoice_value": {
                        "quantity": invoice_line.quantity,
                        "unit_price": round(
                            invoice_line.unit_price or 0,
                            2,
                        ),
                        "amount": round(
                            invoice_line.amount or 0,
                            2,
                        ),
                    },
                }
            )

        # ------------------------------------------------------
        # Detect extra invoice lines not present in the PO
        # ------------------------------------------------------

        for invoice_line in invoice_lines:
            if invoice_line.id not in used_invoice_line_ids:
                mismatches.append(
                    (
                        f"Extra Invoice Line: {invoice_line.description}",
                        "Not Present",
                        invoice_line.description,
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

            # ======================================================
            # Update Invoice Status Based on Match Result
            # ======================================================

            if is_match:
                invoice.processing_status = "Matched"

                # Resolve any previously open matching exceptions
                open_exceptions = (
                    self.db.query(InvoiceException)
                    .filter(
                        InvoiceException.invoice_id == invoice.id,
                        InvoiceException.status == "Open",
                    )
                    .all()
                )

                for exception in open_exceptions:
                    exception.status = "Resolved"
                    exception.resolution_remarks = (
                        "Automatically resolved after a successful re-match."
                    )
                    exception.resolved_by_id = performed_by_id
                    exception.resolved_at = datetime.utcnow()

                self.db.add(
                    InvoiceStatusLog(
                        invoice_id=invoice.id,
                        status="Matched",
                        remarks=(
                            "Invoice successfully matched with "
                            f"Purchase Order {purchase_order.po_number}."
                        ),
                        updated_by="System",
                    )
                )

            else:
                invoice.processing_status = "Review Required"

                existing_exception = (
                    self.db.query(InvoiceException)
                    .filter(
                        InvoiceException.invoice_id == invoice.id,
                        InvoiceException.status == "Open",
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
                    existing_exception.match_run_id = match_run.id
                    exception_id = existing_exception.id

                self.db.add(
                    InvoiceStatusLog(
                        invoice_id=invoice.id,
                        status="Review Required",
                        remarks=(
                            "Invoice matching completed with mismatches. "
                            "Manual review required."
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
        # Debug Values
        # ======================================================

        print("PO total:", purchase_order.total_amount)
        print("PO total USD:", po_total_usd)

        print("Invoice total:", invoice.total_amount)
        print("Invoice tax:", invoice.tax)

        print(
            "Invoice excluding tax:",
            invoice_amount_excluding_tax,
        )

        # ======================================================
        # Response
        # ======================================================

        return {
            "success": True,
            "invoice_id": invoice.id,
            "po_number": purchase_order.po_number,
            "is_match": is_match,
            "is_fully_matched": is_match,
            "match_score": score,
            "matched_details": matched_details,
            "amount_excluding_tax": {
                "po": round(po_total_usd or 0, 2),
                "invoice": round(invoice_amount_excluding_tax or 0, 2),
            },

            "amount_including_tax": {
                "po": round(po_amount_including_tax or 0, 2),
                "invoice": round(invoice_amount_including_tax or 0, 2),
            },

            "tax": {
                "po": round(po_tax_usd or 0, 2),
                "invoice": round(invoice.tax or 0, 2),
                "excluded_from_matching": True,
            },
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
        Mismatch approval override is disabled.

        An invoice must be completely matched before it
        can proceed to invoice approval.
        """

        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            raise ValueError("Invoice not found.")

        raise ValueError(
            "Invoice cannot be approved because the "
            "PO and invoice are not completely matched."
        )

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