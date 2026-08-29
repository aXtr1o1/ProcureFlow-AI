from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.database.models import Invoice, InvoiceException, InvoiceStatusLog, User


class ExceptionService:
    def __init__(self, db: Session):
        self.db = db

    def list(self, status_filter: str | None = None):
        query = self.db.query(InvoiceException).order_by(InvoiceException.id.desc())
        if status_filter:
            query = query.filter(InvoiceException.status == status_filter)
        return query.all()

    def get_by_id(self, exception_id: int) -> InvoiceException:
        exception = self.db.query(InvoiceException).filter(InvoiceException.id == exception_id).first()
        if exception is None:
            raise HTTPException(status_code=404, detail="Invoice exception not found.")
        return exception

    def assign(self, exception_id: int, assigned_to_id: int) -> InvoiceException:
        exception = self.get_by_id(exception_id)
        if exception.status != "Open":
            raise HTTPException(status_code=409, detail="Only open exceptions can be assigned.")
        assignee = self.db.query(User).filter(User.id == assigned_to_id).first()
        if assignee is None:
            raise HTTPException(status_code=404, detail="Assignee not found.")
        exception.assigned_to_id = assignee.id
        self.db.commit()
        self.db.refresh(exception)
        return exception

    def resolve(self, exception_id: int, user_id: int, remarks: str) -> InvoiceException:
        exception = self.get_by_id(exception_id)
        if exception.status != "Open":
            raise HTTPException(status_code=409, detail="Only open exceptions can be resolved.")
        exception.status = "Resolved"
        exception.resolution_remarks = remarks
        exception.resolved_by_id = user_id
        exception.resolved_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(exception)
        return exception

    def approve_override(self, exception_id: int, user_id: int, remarks: str) -> InvoiceException:
        exception = self.get_by_id(exception_id)
        if exception.status != "Open":
            raise HTTPException(status_code=409, detail="Only open exceptions can be overridden.")

        invoice = self.db.query(Invoice).filter(Invoice.id == exception.invoice_id).first()
        if invoice is None:
            raise HTTPException(status_code=404, detail="Invoice not found.")

        exception.status = "Override Approved"
        exception.resolution_remarks = remarks
        exception.resolved_by_id = user_id
        exception.resolved_at = datetime.utcnow()
        invoice.processing_status = "Match Override Approved"
        self.db.add(InvoiceStatusLog(
            invoice_id=invoice.id,
            status="Match Override Approved",
            remarks=f"Match exception {exception.id} approved as an authorized override: {remarks}",
            updated_by="System",
        ))
        self.db.commit()
        self.db.refresh(exception)
        return exception
