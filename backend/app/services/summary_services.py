from typing import Optional

from sqlalchemy.orm import Session
from app.services.azure_openai_service import AzureOpenAIService

from app.database.models import Invoice
from app.services.blob_storage_service import BlobStorageService


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

        prompt = f"""
        Generate a professional invoice summary.

        Invoice Number: {invoice.invoice_number}
        Vendor: {invoice.vendor_name}
        Customer: {invoice.customer_name}
        Invoice Date: {invoice.invoice_date}
        Currency: {invoice.currency}
        Subtotal: {invoice.subtotal}
        Tax: {invoice.tax}
        Total Amount: {invoice.total_amount}

        Provide a concise business summary in 3 to 5 sentences.
        """

        openai_service = AzureOpenAIService()

        summary_text = openai_service.chat(prompt)

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