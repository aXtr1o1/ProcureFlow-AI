from typing import Optional

from click import prompt
from sqlalchemy.orm import Session
from app.services.gemini_service import GeminiService

from app.database.models import Invoice
from app.services.blob_storage_service import BlobStorageService
from app.services import gemini_service


class SummaryService:
    """
    Service responsible for generating invoice summaries.
    """

    def __init__(self, db: Session):
        self.db = db

    def generate_summary(
        self,
        invoice_id: int
    ) -> Optional[dict]:

        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            return None

        line_items = "\n".join(
            [
                f"- {item.description}: Qty {item.quantity}, Amount {item.amount}"
                for item in invoice.line_items
            ]
        )

        prompt = f"""
        You are an invoice analysis assistant.

        Generate a professional summary.

        Invoice Number: {invoice.invoice_number}
        Vendor: {invoice.vendor_name}
        Customer: {invoice.customer_name}
        Invoice Date: {invoice.invoice_date}
        Currency: {invoice.currency}
        Subtotal: {invoice.subtotal}
        Tax: {invoice.tax}
        Total: {invoice.total_amount}

        Line Items:
        {line_items}

        Generate:
        1. Vendor overview
        2. Invoice purpose
        3. Financial summary
        4. Important observations

        Keep the response under 150 words.
        """

        gemini_service = GeminiService()

        summary_text = gemini_service.chat(prompt)

        summary_data = {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "vendor_name": invoice.vendor_name,
            "customer_name": invoice.customer_name,
            "currency": invoice.currency,
            "subtotal": invoice.subtotal,
            "tax": invoice.tax,
            "total_amount": invoice.total_amount,
            "summary": summary_text
        }

        blob_service = BlobStorageService()

        blob = blob_service.upload_summary(
            document_id=invoice.invoice_number,
            summary=summary_data
        )

        summary_data["blob_name"] = blob["blob_name"]
        summary_data["blob_url"] = blob["blob_url"]

        return summary_data