from typing import Dict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import (
    BusinessNeed,
    PurchaseRequisition,
    ProcurementPurchaseOrder,
    GoodsReceipt,
    Invoice,
    Payment,
    InvoiceException,
)


class DashboardService:
    """
    Service responsible for collecting and aggregating
    procurement dashboard data.

    The service reads existing workflow tables and does not
    create or modify any database records.
    """

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================
    # Generic Status Counter
    # ==========================================================

    def _get_status_counts(self, model) -> Dict[str, int]:
        """
        Return status counts for a workflow model.

        Example:

        {
            "Draft": 5,
            "Approved": 10,
            "Rejected": 2
        }
        """

        rows = (
            self.db.query(
                model.status,
                func.count(model.id)
            )
            .group_by(model.status)
            .all()
        )

        return {
            status: count
            for status, count in rows
            if status is not None
        }

    # ==========================================================
    # Count Helpers
    # ==========================================================

    def _count(self, model) -> int:
        """
        Return total number of records for a model.
        """

        return (
            self.db.query(func.count(model.id))
            .scalar()
            or 0
        )

    # ==========================================================
    # Sum Helper
    # ==========================================================

    def _sum(self, model, column) -> float:
        """
        Return a safe numeric sum.
        """

        value = (
            self.db.query(func.coalesce(func.sum(column), 0))
            .scalar()
        )

        return float(value or 0)

    # ==========================================================
    # KPI Data
    # ==========================================================

    def get_kpis(self) -> dict:
        """
        Build high-level dashboard KPIs.
        """

        total_business_needs = self._count(BusinessNeed)

        total_purchase_requisitions = self._count(
            PurchaseRequisition
        )

        total_purchase_orders = self._count(
            ProcurementPurchaseOrder
        )

        total_goods_receipts = self._count(
            GoodsReceipt
        )

        total_invoices = self._count(
            Invoice
        )

        total_payments = self._count(
            Payment
        )

        total_exceptions = (
            self.db.query(func.count(InvoiceException.id))
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        total_po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount
        )

        total_invoice_value = self._sum(
            Invoice,
            Invoice.total_amount
        )

        total_paid_amount = (
            self.db.query(
                func.coalesce(func.sum(Payment.amount), 0)
            )
            .filter(
                Payment.status == "Paid"
            )
            .scalar()
            or 0
        )

        total_pending_payment = (
            self.db.query(
                func.coalesce(func.sum(Payment.amount), 0)
            )
            .filter(
                Payment.status == "Pending"
            )
            .scalar()
            or 0
        )

        return {
            "total_business_needs": total_business_needs,
            "total_purchase_requisitions": total_purchase_requisitions,
            "total_purchase_orders": total_purchase_orders,
            "total_goods_receipts": total_goods_receipts,
            "total_invoices": total_invoices,
            "total_payments": total_payments,
            "total_exceptions": int(total_exceptions),
            "total_po_value": float(total_po_value),
            "total_invoice_value": float(total_invoice_value),
            "total_paid_amount": float(total_paid_amount),
            "total_pending_payment": float(total_pending_payment),
        }

    # ==========================================================
    # Workflow Status Data
    # ==========================================================

    def get_status_data(self) -> dict:
        """
        Return status distribution for every major workflow.
        """

        return {
            "business_need_status": self._get_status_counts(
                BusinessNeed
            ),

            "purchase_requisition_status": self._get_status_counts(
                PurchaseRequisition
            ),

            "purchase_order_status": self._get_status_counts(
                ProcurementPurchaseOrder
            ),

            "goods_receipt_status": self._get_status_counts(
                GoodsReceipt
            ),

            "invoice_status": self._get_status_counts(
                Invoice
            ),

            "payment_status": self._get_status_counts(
                Payment
            ),
        }

    # ==========================================================
    # Procurement Funnel
    # ==========================================================

    def get_funnel(self) -> dict:
        """
        Return the procurement lifecycle funnel.

        Business Need
            ->
        Purchase Requisition
            ->
        Purchase Order
            ->
        Goods Receipt
            ->
        Invoice
            ->
        Payment
        """

        return {
            "business_needs": self._count(
                BusinessNeed
            ),

            "purchase_requisitions": self._count(
                PurchaseRequisition
            ),

            "purchase_orders": self._count(
                ProcurementPurchaseOrder
            ),

            "goods_receipts": self._count(
                GoodsReceipt
            ),

            "invoices": self._count(
                Invoice
            ),

            "payments": self._count(
                Payment
            ),
        }

    # ==========================================================
    # Spend Data
    # ==========================================================

    def get_spend(self) -> dict:
        """
        Return procurement and payment financial metrics.
        """

        total_po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount
        )

        total_invoice_value = self._sum(
            Invoice,
            Invoice.total_amount
        )

        total_paid_amount = (
            self.db.query(
                func.coalesce(func.sum(Payment.amount), 0)
            )
            .filter(
                Payment.status == "Paid"
            )
            .scalar()
            or 0
        )

        total_pending_payment = (
            self.db.query(
                func.coalesce(func.sum(Payment.amount), 0)
            )
            .filter(
                Payment.status == "Pending"
            )
            .scalar()
            or 0
        )

        # There is currently no monetary amount column
        # in InvoiceException, so exception value is based
        # on the related invoice total.
        total_exception_value = (
            self.db.query(
                func.coalesce(
                    func.sum(Invoice.total_amount),
                    0
                )
            )
            .join(
                InvoiceException,
                InvoiceException.invoice_id == Invoice.id
            )
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        return {
            "total_po_value": float(total_po_value),
            "total_invoice_value": float(total_invoice_value),
            "total_paid_amount": float(total_paid_amount),
            "total_pending_payment": float(total_pending_payment),
            "total_exception_value": float(
                total_exception_value
            ),
        }

    # ==========================================================
    # Complete Dashboard Overview
    # ==========================================================

    def get_overview(self) -> dict:
        """
        Return all dashboard information in a single response.
        """

        return {
            "kpis": self.get_kpis(),

            **self.get_status_data(),

            "funnel": self.get_funnel(),

            "spend": self.get_spend(),
        }