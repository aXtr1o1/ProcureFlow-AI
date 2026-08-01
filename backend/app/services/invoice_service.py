from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.database.models import (
    Invoice,
    InvoiceLineItem,
    InvoiceStatusLog
)


class InvoiceService:

    def __init__(self, db: Session):
        self.db = db

    def get_all_invoices(self, user_id: int):
        """
        Fetch all invoices from the database.
        """

        return (
            self.db.query(Invoice)
            .filter(Invoice.user_id == user_id)
            .order_by(Invoice.id.desc())
            .all()
        )

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

    def get_invoice_by_id(self, invoice_id: int, user_id: int):
        return (
            self.db.query(Invoice)
            .filter(
                Invoice.id == invoice_id,
                Invoice.user_id == user_id
            )
            .first()
        )


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