from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.database.models import (
    Payment,
    Invoice,
)


class PaymentService:
    """
    Service layer for Invoice Payment workflow.

    Payment lifecycle:

        Pending
            |
            +----> Paid
            |
            +----> Failed
            |
            +----> Cancelled
    """

    ALLOWED_STATUSES = {
        "Pending",
        "Paid",
        "Failed",
        "Cancelled",
    }

    ALLOWED_TRANSITIONS = {
        "Pending": {
            "Paid",
            "Failed",
            "Cancelled",
        },
        "Paid": set(),
        "Failed": set(),
        "Cancelled": set(),
    }

    def __init__(self, db: Session):
        self.db = db

    # ======================================================
    # Generate Payment Reference
    # ======================================================

    def _generate_payment_reference(self) -> str:
        """
        Generate a unique payment reference.
        """

        prefix = "PAY"

        last_payment = (
            self.db.query(Payment)
            .order_by(Payment.id.desc())
            .first()
        )

        if last_payment:
            next_id = last_payment.id + 1
        else:
            next_id = 1

        return f"{prefix}-{next_id:06d}"

    # ======================================================
    # Get Invoice
    # ======================================================

    def _get_invoice(self, invoice_id: int) -> Invoice:
        invoice = (
            self.db.query(Invoice)
            .filter(Invoice.id == invoice_id)
            .first()
        )

        if invoice is None:
            raise ValueError("Invoice not found.")

        return invoice

    # ======================================================
    # Create Payment
    # ======================================================

    def create_payment(
        self,
        request,
        user_id: int,
    ) -> Payment:
        """
        Create a payment for an invoice.

        New payment starts in Pending status.
        """

        invoice = self._get_invoice(request.invoice_id)

        # ----------------------------------------------
        # Validate payment amount
        # ----------------------------------------------

        if request.amount <= 0:
            raise ValueError(
                "Payment amount must be greater than zero."
            )

        # ----------------------------------------------
        # Prevent payment above invoice amount
        # ----------------------------------------------

        existing_paid_amount = (
            self.db.query(Payment)
            .filter(
                Payment.invoice_id == request.invoice_id,
                Payment.status == "Paid",
            )
            .all()
        )

        total_paid = sum(
            payment.amount
            for payment in existing_paid_amount
        )

        remaining_amount = (
            float(invoice.total_amount or 0) - total_paid
        )

        if request.amount > remaining_amount:
            raise ValueError(
                f"Payment amount exceeds the remaining invoice amount "
                f"of {remaining_amount:.2f}."
            )

        # ----------------------------------------------
        # Validate payment reference
        # ----------------------------------------------

        payment_reference = request.payment_reference.strip()

        if not payment_reference:
            payment_reference = self._generate_payment_reference()

        existing_reference = (
            self.db.query(Payment)
            .filter(
                Payment.payment_reference
                == payment_reference
            )
            .first()
        )

        if existing_reference:
            raise ValueError(
                "Payment reference already exists."
            )

        # ----------------------------------------------
        # Create Payment
        # ----------------------------------------------

        payment = Payment(
            invoice_id=request.invoice_id,
            payment_reference=payment_reference,
            payment_method=request.payment_method,
            amount=request.amount,
            currency=request.currency,
            status="Pending",
            payment_date=request.payment_date,
            due_date=request.due_date,
            remarks=request.remarks,
            created_by_id=user_id,
        )

        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)

        return payment

    # ======================================================
    # Get All Payments
    # ======================================================

    def get_all_payments(self) -> List[Payment]:
        return (
            self.db.query(Payment)
            .order_by(Payment.created_at.desc())
            .all()
        )

    # ======================================================
    # Get Payment by ID
    # ======================================================

    def get_payment(
        self,
        payment_id: int,
    ) -> Optional[Payment]:

        return (
            self.db.query(Payment)
            .filter(Payment.id == payment_id)
            .first()
        )

    # ======================================================
    # Get Payments for Invoice
    # ======================================================

    def get_by_invoice(
        self,
        invoice_id: int,
    ) -> List[Payment]:

        self._get_invoice(invoice_id)

        return (
            self.db.query(Payment)
            .filter(
                Payment.invoice_id == invoice_id
            )
            .order_by(Payment.created_at.desc())
            .all()
        )

    # ======================================================
    # Update Payment Status
    # ======================================================

    def update_status(
        self,
        payment_id: int,
        new_status: str,
        user_id: int,
        remarks: Optional[str] = None,
        payment_date: Optional[datetime] = None,
    ) -> Payment:

        payment = self.get_payment(payment_id)

        if payment is None:
            raise ValueError(
                "Payment not found."
            )

        if new_status not in self.ALLOWED_STATUSES:
            raise ValueError(
                f"Invalid payment status: {new_status}."
            )

        current_status = payment.status

        # ----------------------------------------------
        # Same status
        # ----------------------------------------------

        if current_status == new_status:
            raise ValueError(
                f"Payment is already in '{new_status}' status."
            )

        # ----------------------------------------------
        # Validate transition
        # ----------------------------------------------

        allowed_next_statuses = (
            self.ALLOWED_TRANSITIONS.get(
                current_status,
                set(),
            )
        )

        if new_status not in allowed_next_statuses:
            raise ValueError(
                f"Invalid payment transition: "
                f"{current_status} -> {new_status}."
            )

        # ----------------------------------------------
        # Paid validation
        # ----------------------------------------------

        if new_status == "Paid":

            if payment.amount <= 0:
                raise ValueError(
                    "Payment amount must be greater than zero."
                )

            # Check total paid amount including this payment
            paid_payments = (
                self.db.query(Payment)
                .filter(
                    Payment.invoice_id == payment.invoice_id,
                    Payment.status == "Paid",
                    Payment.id != payment.id,
                )
                .all()
            )

            total_paid = sum(
                p.amount
                for p in paid_payments
            )

            invoice = self._get_invoice(
                payment.invoice_id
            )

            invoice_total = float(
                invoice.total_amount or 0
            )

            if total_paid + payment.amount > invoice_total:
                raise ValueError(
                    "Total paid amount cannot exceed "
                    "the invoice total."
                )

            payment.payment_date = (
                payment_date
                or payment.payment_date
                or datetime.utcnow()
            )

        # ----------------------------------------------
        # Update
        # ----------------------------------------------

        payment.status = new_status

        if remarks is not None:
            payment.remarks = remarks

        self.db.commit()
        self.db.refresh(payment)

        return payment

    # ======================================================
    # Get Invoice Payment Summary
    # ======================================================

    def get_invoice_payment_summary(
        self,
        invoice_id: int,
    ) -> dict:

        invoice = self._get_invoice(invoice_id)

        payments = (
            self.db.query(Payment)
            .filter(
                Payment.invoice_id == invoice_id
            )
            .all()
        )

        invoice_total = float(
            invoice.total_amount or 0
        )

        total_paid = sum(
            payment.amount
            for payment in payments
            if payment.status == "Paid"
        )

        total_pending = sum(
            payment.amount
            for payment in payments
            if payment.status == "Pending"
        )

        total_failed = sum(
            payment.amount
            for payment in payments
            if payment.status == "Failed"
        )

        total_cancelled = sum(
            payment.amount
            for payment in payments
            if payment.status == "Cancelled"
        )

        remaining_amount = max(
            invoice_total - total_paid,
            0,
        )

        if remaining_amount == 0 and invoice_total > 0:
            payment_status = "Paid"
        elif total_paid > 0:
            payment_status = "Partially Paid"
        else:
            payment_status = "Unpaid"

        return {
            "invoice_id": invoice_id,
            "invoice_total": invoice_total,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "total_failed": total_failed,
            "total_cancelled": total_cancelled,
            "remaining_amount": remaining_amount,
            "payment_status": payment_status,
        }