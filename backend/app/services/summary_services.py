from typing import Optional

from sqlalchemy.orm import Session

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

        summary_text = (
            f"Invoice {invoice.invoice_number} from "
            f"{invoice.vendor_name} for "
            f"{invoice.total_amount} {invoice.currency} "
            f"has been processed successfully."
        )

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