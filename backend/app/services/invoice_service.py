from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy import or_, cast, String
from app.database.models import (
    Invoice,
    InvoiceLineItem,
    InvoiceStatusLog,
    ProcurementPurchaseOrder,
)
from app.services.audit_service import AuditService


class InvoiceService:

    def __init__(self, db: Session):
        self.db = db

    def get_all_invoices(self, user_id: int = None):
        """
        Fetch all invoices from the database (newest first).
        """

        query = self.db.query(Invoice)

        # Optional user filter kept for callers that pass user_id intentionally
        # Listing is org-wide so invoices remain visible across accounts.
        return query.order_by(Invoice.id.desc()).all()


    def get_invoice_by_number(self, invoice_number: str):
        """
        Check whether an invoice already exists.
        """
        return (
            self.db.query(Invoice)
            .filter(Invoice.invoice_number == invoice_number)
            .first()
        )

    def save_invoice(
        self,
        user_id: int,
        invoice_data: dict,
        blob_name: str,
        blob_url: str,
        ocr_blob: dict
    ):
        

        try:

            invoice = Invoice(
                user_id=user_id,
                invoice_number=invoice_data.get("invoice_number"),
                vendor_name=invoice_data.get("vendor_name"),
                vendor_address=invoice_data.get("vendor_address"),
                customer_name=invoice_data.get("customer_name"),
                invoice_date=invoice_data.get("invoice_date"),
                due_date=invoice_data.get("due_date"),
                purchase_order_number=invoice_data.get("purchase_order_number"),
                currency=invoice_data.get("currency"),
                subtotal=invoice_data.get("subtotal"),
                tax=invoice_data.get("tax"),
                total_amount=invoice_data.get("total_amount"),
                blob_name=blob_name,
                blob_url=blob_url,
                ocr_json_blob_name=ocr_blob.get("json_blob_name"),
                ocr_json_blob_url=ocr_blob.get("json_blob_url"),
                processing_status="Uploaded"
            )

            self.db.add(invoice)

            self.db.commit()

            self.db.refresh(invoice)

            return invoice

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

    def save_line_items(
        self,
        invoice: Invoice,
        line_items: list
    ):

        for item in line_items:

            invoice_item = InvoiceLineItem(
                invoice_id=invoice.id,
                description=item.get("description"),
                quantity=item.get("quantity"),
                unit_price=item.get("unit_price"),
                amount=item.get("amount")
            )

            self.db.add(invoice_item)

        self.db.commit()

    def save_status_log(
        self,
        invoice: Invoice,
        status: str,
        remarks: str,
        updated_by: str = "System"
    ):

        status_log = InvoiceStatusLog(
            invoice_id=invoice.id,
            status=status,
            remarks=remarks,
            updated_by=updated_by
        )

        self.db.add(status_log)
        self.db.commit()

        return status_log

    def get_invoice_by_id(self, invoice_id: int, user_id: int = None):
        return (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )


    # ==========================================================
    # Link Invoice to Procurement Purchase Order
    # ==========================================================
    def link_invoice_to_purchase_order(
        self,
        invoice_id: int,
        purchase_order_id: int
    ):
        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found."
            )

        purchase_order = (
            self.db.query(ProcurementPurchaseOrder)
            .filter(
                ProcurementPurchaseOrder.id == purchase_order_id
            )
            .first()
        )

        if purchase_order is None:
            raise HTTPException(
                status_code=404,
                detail="Purchase Order not found."
            )

        # ----------------------------------------------------------
        # Validate Purchase Order against Invoice
        # ----------------------------------------------------------

        invoice_vendor = (
            invoice.vendor_name or ""
        ).replace("\n", " ").strip().lower()

        po_vendor = (
            purchase_order.vendor_name or ""
        ).replace("\n", " ").strip().lower()

        mismatch_reasons = []

        if invoice_vendor != po_vendor:
            mismatch_reasons.append(
                f"Vendor mismatch: Invoice vendor '{invoice.vendor_name}' "
                f"does not match PO vendor '{purchase_order.vendor_name}'."
            )

        # ----------------------------------------------------------
        # Link the validated Purchase Order
        # ----------------------------------------------------------

        invoice.procurement_purchase_order_id = purchase_order.id
        invoice.purchase_order_number = purchase_order.po_number

        # ----------------------------------------------------------
        # Check invoice and PO mismatch
        # ----------------------------------------------------------

        mismatch_reasons = []

        # Vendor mismatch
        if invoice_vendor != po_vendor:
            mismatch_reasons.append(
                f"Vendor mismatch: Invoice vendor '{invoice.vendor_name}' "
                f"does not match PO vendor '{purchase_order.vendor_name}'."
            )

        # Amount mismatch
        invoice_total = float(invoice.total_amount or 0)
        po_total = float(purchase_order.total_amount or 0)

        if invoice_total != po_total:
            mismatch_reasons.append(
                f"Amount mismatch: Invoice total is {invoice_total}, "
                f"but PO total is {po_total}."
            )

        if mismatch_reasons:
            invoice.processing_status = "Review Required"

            remarks = (
                "Invoice mismatch detected. Manual review is required. "
                + " ".join(mismatch_reasons)
            )

            self.db.add(
                InvoiceStatusLog(
                    invoice_id=invoice.id,
                    status="Review Required",
                    remarks=remarks,
                    updated_by="System",
                )
            )
        else:
            invoice.processing_status = "Matched"

            self.db.add(
                InvoiceStatusLog(
                    invoice_id=invoice.id,
                    status="Matched",
                    remarks="Invoice matched successfully with the Purchase Order.",
                    updated_by="System",
                )
            )

        self.db.commit()
        self.db.refresh(invoice)

        return invoice

        self.db.add(InvoiceStatusLog(
            invoice_id=invoice.id,
            status="PO Linked",
            remarks=f"Invoice linked to Purchase Order {purchase_order.po_number}.",
            updated_by="System",
        ))

        self.db.commit()
        self.db.refresh(invoice)

        return invoice

    def mark_review_required(
        self,
        invoice: Invoice,
        remarks: str,
    ):
        """
        Move an invoice to Review Required when a mismatch is detected.
        """

        invoice.processing_status = "Review Required"

        self.db.add(
            InvoiceStatusLog(
                invoice_id=invoice.id,
                status="Review Required",
                remarks=remarks,
                updated_by="System",
            )
        )

        self.db.commit()
        self.db.refresh(invoice)

        return invoice

    def send_for_approval(self, invoice_id: int) -> Invoice:
        invoice = self.get_invoice_by_id(invoice_id)
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found.")
        if invoice.procurement_purchase_order_id is None:
            raise HTTPException(
                status_code=409,
                detail="Link the invoice to a Purchase Order before approval.",
            )
        if invoice.processing_status == "Approval Pending":
            return invoice

        if invoice.processing_status not in {
            "Matched",
            "Match Override Approved",
        }:
            raise HTTPException(
                status_code=409,
                detail=(
                    "Only matched invoices or authorized match "
                    "overrides can be sent for approval."
                ),
            )

        invoice.processing_status = "Approval Pending"
        self.db.add(InvoiceStatusLog(
            invoice_id=invoice.id,
            status="Approval Pending",
            remarks="Invoice match was accepted and sent for approval.",
            updated_by="System",
        ))
        self.db.commit()
        self.db.refresh(invoice)
        return invoice


    def get_invoice_line_items(self, invoice_id: int):
        return (
            self.db.query(InvoiceLineItem)
            .filter(InvoiceLineItem.invoice_id == invoice_id)
            .all()
        )


    def get_invoice_status_logs(self, invoice_id: int):
        return (
            self.db.query(InvoiceStatusLog)
            .filter(InvoiceStatusLog.invoice_id == invoice_id)
            .order_by(InvoiceStatusLog.created_at.asc())
            .all()
        )

    def search_invoices(self, query: str):
        """
        Search invoices in SQLite by number, vendor, customer, status, PO, dates, etc.
        """
        term = (query or "").strip()
        if not term:
            return []

        like = f"%{term}%"

        return (
            self.db.query(Invoice)
            .filter(
                or_(
                    Invoice.invoice_number.ilike(like),
                    Invoice.vendor_name.ilike(like),
                    Invoice.vendor_address.ilike(like),
                    Invoice.customer_name.ilike(like),
                    Invoice.processing_status.ilike(like),
                    Invoice.purchase_order_number.ilike(like),
                    Invoice.invoice_date.ilike(like),
                    Invoice.due_date.ilike(like),
                    Invoice.currency.ilike(like),
                    # Also match numeric amount if user types a number
                    cast(Invoice.total_amount, String).ilike(like),
                    cast(Invoice.subtotal, String).ilike(like),
                )
            )
            .order_by(Invoice.id.desc())
            .all()
        )

    def search_invoices_by_number(self, invoice_number: str):
        term = (invoice_number or "").strip()
        if not term:
            return []

        like = f"%{term}%"
        return (
            self.db.query(Invoice)
            .filter(Invoice.invoice_number.ilike(like))
            .order_by(Invoice.id.desc())
            .all()
        )

    def search_invoices_by_vendor(self, vendor_name: str):
        term = (vendor_name or "").strip()
        if not term:
            return []

        like = f"%{term}%"
        return (
            self.db.query(Invoice)
            .filter(Invoice.vendor_name.ilike(like))
            .order_by(Invoice.id.desc())
            .all()
        )
