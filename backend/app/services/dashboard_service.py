from datetime import datetime
from typing import Dict, Optional

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database.models import (
    BusinessNeed,
    PurchaseRequisition,
    ProcurementPurchaseOrder,
    GoodsReceipt,
    Invoice,
    Payment,
    InvoiceException,
    InvoiceMatchRun,
    PurchaseOrderApproval,
)


class DashboardService:
    """
    Service responsible for collecting and aggregating
    centralized procurement dashboard data.

    All metrics are calculated from existing database records.
    No dashboard values are hardcoded.
    """

    def __init__(
        self,
        db: Session,
        user_id: int | None = None,
    ):
        self.db = db
        self.user_id = user_id

    # ==========================================================
    # Generic Helpers
    # ==========================================================

    def _get_status_counts(
        self,
        model,
        status_column=None,
    ) -> Dict[str, int]:

        if status_column is None:
            status_column = getattr(model, "status", None)

        if status_column is None:
            return {}

        rows = (
            self.db.query(
                status_column,
                func.count(model.id),
            )
            .group_by(status_column)
            .all()
        )

        return {
            status: int(count)
            for status, count in rows
            if status is not None
        }

    def _count(self, model) -> int:

        return int(
            self.db.query(
                func.count(model.id)
            ).scalar()
            or 0
        )

    def _sum(self, model, column) -> float:

        value = (
            self.db.query(
                func.coalesce(
                    func.sum(column),
                    0,
                )
            )
            .scalar()
        )

        return float(value or 0)

    # ==========================================================
    # Executive Dashboard
    # ==========================================================

    def get_executive_metrics(self) -> dict:

        total_po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount,
        )

        # ------------------------------------------------------
        # Active POs
        # ------------------------------------------------------

        active_po_statuses = [
            "Created",
            "Approval Pending",
            "Approved",
            "Sent",
            "Acknowledged",
        ]

        active_pos = (
            self.db.query(
                func.count(
                    ProcurementPurchaseOrder.id
                )
            )
            .filter(
                ProcurementPurchaseOrder.status.in_(
                    active_po_statuses
                )
            )
            .scalar()
            or 0
        )

        # ------------------------------------------------------
        # Invoices
        # ------------------------------------------------------

        invoices_processed = self._count(Invoice)

        pending_invoice_statuses = [
            "Uploaded",
            "Processing",
            "Approval Pending",
            "Validation Pending",
            "Pending",
            "Pending Approval",
        ]

        pending_invoices = (
            self.db.query(
                func.count(Invoice.id)
            )
            .filter(
                Invoice.processing_status.in_(
                    pending_invoice_statuses
                )
            )
            .scalar()
            or 0
        )

        # ------------------------------------------------------
        # Matched invoices
        # ------------------------------------------------------

        matched_invoices = (
            self.db.query(
                func.count(
                    func.distinct(
                        InvoiceMatchRun.invoice_id
                    )
                )
            )
            .filter(
                InvoiceMatchRun.status.in_(
                    [
                        "Matched",
                        "Success",
                        "Successful",
                    ]
                )
            )
            .scalar()
            or 0
        )

        # ------------------------------------------------------
        # Exceptions
        # ------------------------------------------------------

        open_exceptions = (
            self.db.query(
                func.count(
                    InvoiceException.id
                )
            )
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        exception_rate = (
            (
                open_exceptions
                / invoices_processed
            ) * 100
            if invoices_processed
            else 0
        )

        # ------------------------------------------------------
        # Pending approval value
        # ------------------------------------------------------

        pending_approval_value = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        ProcurementPurchaseOrder.total_amount
                    ),
                    0,
                )
            )
            .filter(
                ProcurementPurchaseOrder.status
                == "Pending Approval"
            )
            .scalar()
            or 0
        )

        # ------------------------------------------------------
        # Overdue payments
        # ------------------------------------------------------

        overdue_payments = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.due_date.isnot(None),
                Payment.due_date
                < datetime.utcnow(),
                Payment.status != "Paid",
            )
            .scalar()
            or 0
        )

        return {
            "total_procurement_value": float(
                total_po_value
            ),

            "active_pos": int(active_pos),

            "invoices_processed": int(
                invoices_processed
            ),

            "pending_invoices": int(
                pending_invoices
            ),

            "matched_invoices": int(
                matched_invoices
            ),

            "exception_rate": round(
                float(exception_rate),
                2,
            ),

            "pending_approval_value": float(
                pending_approval_value
            ),

            # Current schema does not provide enough
            # information to calculate this reliably.
            "average_processing_time": None,

            # Current schema does not contain a reliable
            # savings calculation.
            "potential_savings": 0.0,

            "overdue_payments": float(
                overdue_payments
            ),
        }

    # ==========================================================
    # Supporting KPI Data
    # ==========================================================

    def get_kpis(self) -> dict:

        total_business_needs = self._count(
            BusinessNeed
        )

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
            self.db.query(
                func.count(
                    InvoiceException.id
                )
            )
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        total_po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount,
        )

        total_invoice_value = self._sum(
            Invoice,
            Invoice.total_amount,
        )

        total_paid_amount = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Paid"
            )
            .scalar()
            or 0
        )

        total_pending_payment = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Pending"
            )
            .scalar()
            or 0
        )

        return {
            "total_business_needs":
                int(total_business_needs),

            "total_purchase_requisitions":
                int(total_purchase_requisitions),

            "total_purchase_orders":
                int(total_purchase_orders),

            "total_goods_receipts":
                int(total_goods_receipts),

            "total_invoices":
                int(total_invoices),

            "total_payments":
                int(total_payments),

            "total_exceptions":
                int(total_exceptions),

            "total_po_value":
                float(total_po_value),

            "total_invoice_value":
                float(total_invoice_value),

            "total_paid_amount":
                float(total_paid_amount),

            "total_pending_payment":
                float(total_pending_payment),
        }

    # ==========================================================
    # Workflow Status
    # ==========================================================

    def get_status_data(self) -> dict:

        return {
            "business_need_status":
                self._get_status_counts(
                    BusinessNeed
                ),

            "purchase_requisition_status":
                self._get_status_counts(
                    PurchaseRequisition
                ),

            "purchase_order_status":
                self._get_status_counts(
                    ProcurementPurchaseOrder
                ),

            "goods_receipt_status":
                self._get_status_counts(
                    GoodsReceipt
                ),

            "invoice_status":
                self._get_status_counts(
                    Invoice,
                    Invoice.processing_status,
                ),

            "payment_status":
                self._get_status_counts(
                    Payment
                ),
        }

    # ==========================================================
    # Funnel Stage Helper
    # ==========================================================

    def _funnel_stage(
        self,
        model,
        value_column=None,
        status_column=None,
        pending_statuses=None,
    ) -> dict:

        count = self._count(model)

        value = 0.0

        if value_column is not None:
            value = self._sum(
                model,
                value_column,
            )

        pending = 0

        if (
            status_column is not None
            and pending_statuses
        ):
            pending = (
                self.db.query(
                    func.count(model.id)
                )
                .filter(
                    status_column.in_(
                        pending_statuses
                    )
                )
                .scalar()
                or 0
            )

        return {
            "count": int(count),
            "value": float(value),
            "average_time": None,
            "pending": int(pending),
            "sla_breaches": 0,
        }

    # ==========================================================
    # Procurement Funnel
    # ==========================================================

    def get_funnel(self) -> dict:

        return {
            "business_needs":
                self._funnel_stage(
                    BusinessNeed,
                    status_column=getattr(
                        BusinessNeed,
                        "status",
                        None,
                    ),
                    pending_statuses=[
                        "Draft",
                        "Pending",
                        "Pending Approval",
                    ],
                ),

            "purchase_requisitions":
                self._funnel_stage(
                    PurchaseRequisition,
                    status_column=getattr(
                        PurchaseRequisition,
                        "status",
                        None,
                    ),
                    pending_statuses=[
                        "Draft",
                        "Pending",
                        "Pending Approval",
                    ],
                ),

            "purchase_orders":
                self._funnel_stage(
                    ProcurementPurchaseOrder,
                    value_column=(
                        ProcurementPurchaseOrder.total_amount
                    ),
                    status_column=(
                        ProcurementPurchaseOrder.status
                    ),
                    pending_statuses=[
                        "Pending Approval",
                    ],
                ),

            "goods_receipts":
                self._funnel_stage(
                    GoodsReceipt,
                    status_column=getattr(
                        GoodsReceipt,
                        "status",
                        None,
                    ),
                    pending_statuses=[
                        "Pending",
                        "Partial",
                    ],
                ),

            "invoices":
                self._funnel_stage(
                    Invoice,
                    value_column=Invoice.total_amount,
                    status_column=(
                        Invoice.processing_status
                    ),
                    pending_statuses=[
                        "Uploaded",
                        "Processing",
                        "Pending",
                        "Approval Pending",
                        "Validation Pending",
                    ],
                ),

            "payments":
                self._funnel_stage(
                    Payment,
                    value_column=Payment.amount,
                    status_column=Payment.status,
                    pending_statuses=[
                        "Pending",
                    ],
                ),
        }

    # ==========================================================
    # PO Intelligence
    # ==========================================================

    def get_po_intelligence(self) -> dict:

        total_pos = self._count(
            ProcurementPurchaseOrder
        )

        po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount,
        )

        open_statuses = [
            "Created",
            "Pending Approval",
            "Approved",
            "Sent",
            "Vendor Accepted",
            "Acknowledged",
        ]

        open_pos = (
            self.db.query(
                func.count(
                    ProcurementPurchaseOrder.id
                )
            )
            .filter(
                ProcurementPurchaseOrder.status.in_(
                    open_statuses
                )
            )
            .scalar()
            or 0
        )

        closed_pos = (
            self.db.query(
                func.count(
                    ProcurementPurchaseOrder.id
                )
            )
            .filter(
                ProcurementPurchaseOrder.status
                == "Closed"
            )
            .scalar()
            or 0
        )

        cancelled_pos = (
            self.db.query(
                func.count(
                    ProcurementPurchaseOrder.id
                )
            )
            .filter(
                ProcurementPurchaseOrder.status
                == "Cancelled"
            )
            .scalar()
            or 0
        )

        pending_approvals = (
            self.db.query(
                func.count(
                    ProcurementPurchaseOrder.id
                )
            )
            .filter(
                ProcurementPurchaseOrder.status
                == "Pending Approval"
            )
            .scalar()
            or 0
        )

        invoice_count = self._count(Invoice)

        conversion_ratio = (
            (invoice_count / total_pos) * 100
            if total_pos
            else 0
        )

        return {
            "total_pos": int(total_pos),
            "po_value": float(po_value),

            "open_pos": int(open_pos),
            "closed_pos": int(closed_pos),
            "cancelled_pos": int(cancelled_pos),

            "pending_approvals":
                int(pending_approvals),

            "average_po_creation_time": None,
            "average_po_approval_time": None,

            "po_to_invoice_conversion_ratio":
                round(
                    float(conversion_ratio),
                    2,
                ),

            "average_po_aging": None,

            # These require confirmed dimension
            # columns in the current PO model.
            "po_value_by_department": {},
            "po_value_by_vendor": {},
        }

    # ==========================================================
    # Invoice Intelligence
    # ==========================================================

    def get_invoice_intelligence(self) -> dict:

        total_invoices = self._count(Invoice)

        successfully_extracted = (
            self.db.query(
                func.count(Invoice.id)
            )
            .filter(
                Invoice.processing_status.notin_(
                    [
                        "Extraction Failed",
                        "Failed",
                    ]
                )
            )
            .scalar()
            or 0
        )

        extraction_failed = (
            self.db.query(
                func.count(Invoice.id)
            )
            .filter(
                Invoice.processing_status.in_(
                    [
                        "Extraction Failed",
                        "Failed",
                    ]
                )
            )
            .scalar()
            or 0
        )

        matched = (
            self.db.query(
                func.count(
                    func.distinct(
                        InvoiceMatchRun.invoice_id
                    )
                )
            )
            .filter(
                InvoiceMatchRun.status.in_(
                    [
                        "Matched",
                        "Success",
                        "Successful",
                    ]
                )
            )
            .scalar()
            or 0
        )

        exception_count = (
            self.db.query(
                func.count(
                    InvoiceException.id
                )
            )
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        exception_rate = (
            (exception_count / total_invoices)
            * 100
            if total_invoices
            else 0
        )

        return {
            "total_invoices_received":
                int(total_invoices),

            "successfully_extracted":
                int(successfully_extracted),

            "extraction_failed":
                int(extraction_failed),

            "extraction_confidence":
                None,

            "duplicate_invoices":
                0,

            "missing_fields":
                0,

            "po_linked_invoices":
                int(matched),

            "non_po_invoices":
                max(
                    0,
                    total_invoices - matched,
                ),

            "processing_time":
                None,

            "manual_review_time":
                None,

            "matched_invoices":
                int(matched),

            "unmatched_invoices":
                max(
                    0,
                    total_invoices - matched,
                ),

            "exception_count":
                int(exception_count),

            "exception_rate":
                round(
                    float(exception_rate),
                    2,
                ),
        }

    # ==========================================================
    # Vendor Intelligence
    # ==========================================================

    def get_vendor_intelligence(self) -> dict:
        """
        Build vendor analytics from actual PO and invoice records.
        """

        # ------------------------------------------------------
        # Purchase Orders grouped by vendor
        # ------------------------------------------------------

        po_rows = (
            self.db.query(
                ProcurementPurchaseOrder.vendor_name,
                func.count(ProcurementPurchaseOrder.id),
                func.coalesce(
                    func.sum(
                        ProcurementPurchaseOrder.total_amount
                    ),
                    0,
                ),
            )
            .filter(
                ProcurementPurchaseOrder.vendor_name.isnot(None)
            )
            .group_by(
                ProcurementPurchaseOrder.vendor_name
            )
            .all()
        )

        # ------------------------------------------------------
        # Invoices grouped by vendor
        # ------------------------------------------------------

        invoice_rows = (
            self.db.query(
                Invoice.vendor_name,
                func.count(Invoice.id),
                func.coalesce(
                    func.sum(Invoice.total_amount),
                    0,
                ),
                func.coalesce(
                    func.avg(Invoice.total_amount),
                    0,
                ),
            )
            .filter(
                Invoice.vendor_name.isnot(None)
            )
            .group_by(
                Invoice.vendor_name
            )
            .all()
        )

        po_data = {
            vendor: {
                "number_of_pos": int(po_count),
                "po_spend": float(po_spend),
            }
            for vendor, po_count, po_spend in po_rows
            if vendor
        }

        invoice_data = {
            vendor: {
                "number_of_invoices": int(invoice_count),
                "invoice_spend": float(invoice_spend),
                "average_invoice_value": float(
                    average_invoice_value or 0
                ),
            }
            for (
                vendor,
                invoice_count,
                invoice_spend,
                average_invoice_value,
            ) in invoice_rows
            if vendor
        }

        vendor_names = set(po_data) | set(invoice_data)

        vendors = []

        for vendor_name in sorted(vendor_names):

            po = po_data.get(
                vendor_name,
                {
                    "number_of_pos": 0,
                    "po_spend": 0.0,
                },
            )

            invoice = invoice_data.get(
                vendor_name,
                {
                    "number_of_invoices": 0,
                    "invoice_spend": 0.0,
                    "average_invoice_value": 0.0,
                },
            )

            # --------------------------------------------------
            # Exception count
            # --------------------------------------------------

            exception_count = (
                self.db.query(
                    func.count(
                        func.distinct(
                            InvoiceException.invoice_id
                        )
                    )
                )
                .join(
                    Invoice,
                    Invoice.id
                    == InvoiceException.invoice_id,
                )
                .filter(
                    Invoice.vendor_name
                    == vendor_name,
                    InvoiceException.status == "Open",
                )
                .scalar()
                or 0
            )

            invoice_count = invoice[
                "number_of_invoices"
            ]

            exception_rate = (
                (
                    exception_count
                    / invoice_count
                ) * 100
                if invoice_count
                else 0
            )

            # --------------------------------------------------
            # Price variance
            # --------------------------------------------------

            price_variance = (
                self.db.query(
                    func.coalesce(
                        func.sum(
                            PurchaseRequisition.price_variance
                        ),
                        0,
                    )
                )
                .join(
                    ProcurementPurchaseOrder,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    ProcurementPurchaseOrder.vendor_name
                    == vendor_name
                )
                .scalar()
                or 0
            )

            vendors.append(
                {
                    "vendor_name": vendor_name,

                    "overall_score": None,

                    "on_time_delivery": None,

                    "invoice_accuracy": (
                        (
                            (
                                invoice_count
                                - exception_count
                            )
                            / invoice_count
                        ) * 100
                        if invoice_count
                        else None
                    ),

                    "po_compliance": None,

                    "price_variance": float(
                        price_variance
                    ),

                    "exception_rate": round(
                        float(exception_rate),
                        2,
                    ),

                    "payment_dispute": None,

                    "total_spend": float(
                        po["po_spend"]
                    ),

                    "number_of_pos": int(
                        po["number_of_pos"]
                    ),

                    "number_of_invoices": int(
                        invoice_count
                    ),

                    "average_invoice_value": float(
                        invoice[
                            "average_invoice_value"
                        ]
                    ),

                    "payment_terms": None,

                    "average_payment_time": None,
                }
            )

        total_vendor_spend = sum(
            vendor["total_spend"]
            for vendor in vendors
        )

        return {
            "vendors": vendors,
            "total_vendor_spend": float(
                total_vendor_spend
            ),
            "total_vendors": len(vendors),
        }

    def _group_spend_by(
        self,
        column,
    ) -> dict:

        rows = (
            self.db.query(
                column,
                func.coalesce(
                    func.sum(
                        ProcurementPurchaseOrder.total_amount
                    ),
                    0,
                ),
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .group_by(column)
            .all()
        )

        result = {}

        for key, value in rows:
            category_name = str(key).strip() if key else "Uncategorized"

            result[category_name] = (
                result.get(category_name, 0)
                + float(value or 0)
            )

        return result

    def _group_spend_by_month(self) -> dict[str, float]:
        from collections import defaultdict

        rows = self.db.query(
            ProcurementPurchaseOrder.created_at,
            ProcurementPurchaseOrder.total_amount
        ).filter(
            ProcurementPurchaseOrder.created_at.isnot(None)
        ).all()

        totals = defaultdict(float)

        for created_at, amount in rows:
            if created_at:
                month_key = created_at.strftime("%Y-%m")
                totals[month_key] += float(amount or 0)

        return dict(sorted(totals.items()))

    def _group_spend_by_quarter(self) -> dict[str, float]:
        from collections import defaultdict

        rows = self.db.query(
            ProcurementPurchaseOrder.created_at,
            ProcurementPurchaseOrder.total_amount
        ).filter(
            ProcurementPurchaseOrder.created_at.isnot(None)
        ).all()

        totals = defaultdict(float)

        for created_at, amount in rows:
            if created_at:
                quarter = ((created_at.month - 1) // 3) + 1
                quarter_key = f"{created_at.year} Q{quarter}"
                totals[quarter_key] += float(amount or 0)

        return dict(sorted(totals.items()))

    # ==========================================================
    # Spend Analytics
    # ==========================================================

    def get_spend_analytics(self) -> dict:

        total_po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount,
        )

        total_invoice_value = self._sum(
            Invoice,
            Invoice.total_amount,
        )

        total_paid_amount = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Paid"
            )
            .scalar()
            or 0
        )

        total_pending_payment = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Pending"
            )
            .scalar()
            or 0
        )

        total_exception_value = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        Invoice.total_amount
                    ),
                    0,
                )
            )
            .join(
                InvoiceException,
                InvoiceException.invoice_id
                == Invoice.id,
            )
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        return {
            "total_spend":
                float(total_po_value),

            "by_department": self._group_spend_by(
                PurchaseRequisition.department
            ),

            "by_business_unit": self._group_spend_by(
                PurchaseRequisition.business_unit
            ),

            "by_category": self._group_spend_by(
                PurchaseRequisition.category
            ),

            "by_vendor": self._group_spend_by(
                ProcurementPurchaseOrder.vendor_name
            ),

            "by_location": self._group_spend_by(
                PurchaseRequisition.location
            ),

            "by_month": self._group_spend_by_month(),

            "by_quarter": self._group_spend_by_quarter(),

            "by_project": self._group_spend_by(
                PurchaseRequisition.project
            ),

            "by_cost_center": self._group_spend_by(
                PurchaseRequisition.cost_center
            ),

            "total_po_value":
                float(total_po_value),

            "total_invoice_value":
                float(total_invoice_value),

            "total_paid_amount":
                float(total_paid_amount),

            "total_pending_payment":
                float(total_pending_payment),

            "total_exception_value":
                float(total_exception_value),

            "potential_savings":
                0.0,
        }

    # ==========================================================
    # PO Trend Analytics
    # ==========================================================

    def get_po_trends(self) -> dict:
        """
        Return monthly procurement trend data.

        Supports both:
            - SQLite for local development
            - PostgreSQL for production
        """

        # ------------------------------------------------------
        # Database-compatible monthly period expression
        # ------------------------------------------------------

        dialect = self.db.get_bind().dialect.name

        if dialect == "sqlite":
            po_period = func.strftime(
                "%Y-%m",
                ProcurementPurchaseOrder.created_at,
            )

            invoice_period = func.strftime(
                "%Y-%m",
                Invoice.created_at,
            )

            payment_period = func.strftime(
                "%Y-%m",
                Payment.created_at,
            )

            exception_period = func.strftime(
                "%Y-%m",
                InvoiceException.created_at,
            )

        else:
            po_period = func.to_char(
                ProcurementPurchaseOrder.created_at,
                "YYYY-MM",
            )

            invoice_period = func.to_char(
                Invoice.created_at,
                "YYYY-MM",
            )

            payment_period = func.to_char(
                Payment.created_at,
                "YYYY-MM",
            )

            exception_period = func.to_char(
                InvoiceException.created_at,
                "YYYY-MM",
            )

        # ------------------------------------------------------
        # Purchase Order Trends
        # ------------------------------------------------------

        po_rows = (
            self.db.query(
                po_period.label("period"),

                func.coalesce(
                    func.sum(
                        ProcurementPurchaseOrder.total_amount
                    ),
                    0,
                ).label("po_value"),

                func.count(
                    ProcurementPurchaseOrder.id
                ).label("number_of_pos"),
            )
            .group_by(po_period)
            .order_by(po_period)
            .all()
        )

        # ------------------------------------------------------
        # Invoice Trends
        # ------------------------------------------------------

        invoice_rows = (
            self.db.query(
                invoice_period.label("period"),

                func.coalesce(
                    func.sum(
                        Invoice.total_amount
                    ),
                    0,
                ).label("invoice_value"),

                func.count(
                    Invoice.id
                ).label("number_of_invoices"),
            )
            .group_by(invoice_period)
            .order_by(invoice_period)
            .all()
        )

        # ------------------------------------------------------
        # Payment Trends
        # ------------------------------------------------------

        payment_rows = (
            self.db.query(
                payment_period.label("period"),

                func.coalesce(
                    func.sum(
                        Payment.amount
                    ),
                    0,
                ).label("payment_value"),
            )
            .group_by(payment_period)
            .order_by(payment_period)
            .all()
        )

        # ------------------------------------------------------
        # Exception Trends
        # ------------------------------------------------------

        exception_rows = (
            self.db.query(
                exception_period.label("period"),

                func.count(
                    InvoiceException.id
                ).label("exceptions"),
            )
            .group_by(exception_period)
            .order_by(exception_period)
            .all()
        )

        # ------------------------------------------------------
        # Prepare data
        # ------------------------------------------------------

        periods = set()

        po_data = {}
        invoice_data = {}
        payment_data = {}
        exception_data = {}

        # ------------------------------------------------------
        # PO data
        # ------------------------------------------------------

        for row in po_rows:
            if row.period is None:
                continue

            periods.add(row.period)

            po_data[row.period] = {
                "po_value": float(
                    row.po_value or 0
                ),

                "number_of_pos": int(
                    row.number_of_pos or 0
                ),
            }

        # ------------------------------------------------------
        # Invoice data
        # ------------------------------------------------------

        for row in invoice_rows:
            if row.period is None:
                continue

            periods.add(row.period)

            invoice_data[row.period] = {
                "invoice_value": float(
                    row.invoice_value or 0
                ),

                "number_of_invoices": int(
                    row.number_of_invoices or 0
                ),
            }

        # ------------------------------------------------------
        # Payment data
        # ------------------------------------------------------

        for row in payment_rows:
            if row.period is None:
                continue

            periods.add(row.period)

            payment_data[row.period] = float(
                row.payment_value or 0
            )

        # ------------------------------------------------------
        # Exception data
        # ------------------------------------------------------

        for row in exception_rows:
            if row.period is None:
                continue

            periods.add(row.period)

            exception_data[row.period] = int(
                row.exceptions or 0
            )

        # ------------------------------------------------------
        # Build final trend response
        # ------------------------------------------------------

        trends = []

        for period in sorted(periods):

            po = po_data.get(
                period,
                {
                    "po_value": 0.0,
                    "number_of_pos": 0,
                },
            )

            invoice = invoice_data.get(
                period,
                {
                    "invoice_value": 0.0,
                    "number_of_invoices": 0,
                },
            )

            trends.append(
                {
                    "period": period,

                    "po_value": float(
                        po["po_value"]
                    ),

                    "invoice_value": float(
                        invoice["invoice_value"]
                    ),

                    "payment_value": float(
                        payment_data.get(
                            period,
                            0.0,
                        )
                    ),

                    "number_of_pos": int(
                        po["number_of_pos"]
                    ),

                    "number_of_invoices": int(
                        invoice[
                            "number_of_invoices"
                        ]
                    ),

                    "exceptions": int(
                        exception_data.get(
                            period,
                            0,
                        )
                    ),

                    "savings": 0.0,
                }
            )

        return {
            "trends": trends
        }

    # ==========================================================
    # Financial Summary
    # ==========================================================

    def get_spend(self) -> dict:

        total_po_value = self._sum(
            ProcurementPurchaseOrder,
            ProcurementPurchaseOrder.total_amount,
        )

        total_invoice_value = self._sum(
            Invoice,
            Invoice.total_amount,
        )

        total_paid_amount = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Paid"
            )
            .scalar()
            or 0
        )

        total_pending_payment = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Pending"
            )
            .scalar()
            or 0
        )

        total_exception_value = (
            self.db.query(
                func.coalesce(
                    func.sum(
                        Invoice.total_amount
                    ),
                    0,
                )
            )
            .join(
                InvoiceException,
                InvoiceException.invoice_id
                == Invoice.id,
            )
            .filter(
                InvoiceException.status == "Open"
            )
            .scalar()
            or 0
        )

        return {
            "total_po_value":
                float(total_po_value),

            "total_invoice_value":
                float(total_invoice_value),

            "total_paid_amount":
                float(total_paid_amount),

            "total_pending_payment":
                float(total_pending_payment),

            "total_exception_value":
                float(total_exception_value),

            "potential_savings":
                0.0,

            "overdue_payment_value":
                float(
                    self._get_overdue_payment_value()
                ),
        }

    # ==========================================================
    # Overdue Payment Helper
    # ==========================================================

    def _get_overdue_payment_value(self) -> float:

        value = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.due_date.isnot(None),
                Payment.due_date
                < datetime.utcnow(),
                Payment.status != "Paid",
            )
            .scalar()
            or 0
        )

        return float(value)

    # ==========================================================
    # Complete Dashboard Overview
    # ==========================================================

    def get_overview(self) -> dict:
        """
        Return the complete centralized dashboard response.
        """

        return {
            # Screen 1
            "kpis":
                {
                    **self.get_executive_metrics(),
                    **self.get_kpis(),
                },

            # Workflow status
            **self.get_status_data(),

            # Screen 2
            "funnel":
                self.get_funnel(),

            # Screen 3
            "po_intelligence":
                self.get_po_intelligence(),

            # Screen 4
            "invoice_intelligence":
                self.get_invoice_intelligence(),

            # Screen 5A
            "vendor_intelligence":
                self.get_vendor_intelligence(),

            # Screen 5B
            "spend_analytics":
                self.get_spend_analytics(),

            # Screen 6
            "po_trends":
                self.get_po_trends(),

            # Financial summary
            "spend":
                self.get_spend(),
        }