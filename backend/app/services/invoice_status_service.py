from typing import List, Optional

from sqlalchemy.orm import Session

from app.database.models import (
    Invoice,
    InvoiceStatusLog,
)


class InvoiceStatusService:
    """
    Service responsible for Invoice Status operations.
    """

    def __init__(self, db: Session):
        self.db = db

    # ======================================================
    # Get Current Invoice Status
    # ======================================================
    def get_invoice_status(
        self,
        invoice_id: int
    ) -> Optional[Invoice]:

        return (
            self.db.query(Invoice)
            .filter(
                Invoice.id == invoice_id
            )
            .first()
        )

    # ======================================================
    # Get Invoice Status History
    # ======================================================
    def get_status_history(
        self,
        invoice_id: int
    ) -> List[InvoiceStatusLog]:

        return (
            self.db.query(InvoiceStatusLog)
            .filter(
                InvoiceStatusLog.invoice_id == invoice_id
            )
            .order_by(
                InvoiceStatusLog.created_at.desc()
            )
            .all()
        )