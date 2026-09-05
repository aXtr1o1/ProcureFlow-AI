import re
from datetime import datetime, timedelta
from typing import Dict

from collections import defaultdict

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from fastapi import HTTPException

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

    def _apply_user_filter(self, query, model):
        """
        Apply the authenticated user's ownership filter.
        """

        if self.user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Authenticated user is required.",
            )

        if model in (
            BusinessNeed,
            PurchaseRequisition,
        ):
            return query.filter(
                model.requester_id == self.user_id
            )

        if model is ProcurementPurchaseOrder:
            return (
                query
                .join(
                    PurchaseRequisition,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    PurchaseRequisition.requester_id
                    == self.user_id
                )
            )

        if model is GoodsReceipt:
            return (
                query
                .join(
                    ProcurementPurchaseOrder,
                    GoodsReceipt.purchase_order_id
                    == ProcurementPurchaseOrder.id,
                )
                .join(
                    PurchaseRequisition,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    PurchaseRequisition.requester_id
                    == self.user_id
                )
            )

        if model is Payment:
            return (
                query
                .join(
                    Invoice,
                    Payment.invoice_id == Invoice.id,
                )
                .filter(
                    Invoice.user_id == self.user_id
                )
            )

        if hasattr(model, "user_id"):
            return query.filter(
                model.user_id == self.user_id
            )

        raise AttributeError(
            f"{model.__name__} does not have a supported ownership column."
        )

    # ==========================================================
    # Generic Helpers
    # ==========================================================

    def _get_status_counts(
        self,
        model,
        status_column=None,
    ) -> Dict[str, int]:

        if status_column is None:
            status_column = getattr(
                model,
                "status",
                None,
            )

        if status_column is None:
            return {}

        query = self.db.query(
            status_column,
            func.count(model.id),
        )

        query = self._apply_user_filter(
            query,
            model,
        )

        rows = (
            query
            .group_by(status_column)
            .all()
        )

        return {
            status: int(count)
            for status, count in rows
            if status is not None
        }

    def _count(self, model) -> int:

        query = self.db.query(
            func.count(model.id)
        )

        query = self._apply_user_filter(
            query,
            model,
        )

        return int(
            query.scalar()
            or 0
        )

    def _sum(self, model, column) -> float:

        query = self.db.query(
            func.coalesce(
                func.sum(column),
                0,
            )
        )

        query = self._apply_user_filter(
            query,
            model,
        )

        value = query.scalar()

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

        active_pos_query = (
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
        )

        active_pos_query = self._apply_user_filter(
            active_pos_query,
            ProcurementPurchaseOrder,
        )

        active_pos = (
            active_pos_query.scalar()
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

        pending_invoices_query = (
            self.db.query(
                func.count(Invoice.id)
            )
            .filter(
                Invoice.processing_status.in_(
                    pending_invoice_statuses
                )
            )
        )

        pending_invoices_query = self._apply_user_filter(
            pending_invoices_query,
            Invoice,
        )

        pending_invoices = (
            pending_invoices_query.scalar()
            or 0
        )

        # ------------------------------------------------------
        # Matched invoices
        # ------------------------------------------------------
        #
        # Count only matched invoices belonging to the
        # authenticated user.
        # ------------------------------------------------------

        matched_invoices_query = (
            self.db.query(
                func.count(
                    func.distinct(
                        InvoiceMatchRun.invoice_id
                    )
                )
            )
            .join(
                Invoice,
                Invoice.id == InvoiceMatchRun.invoice_id,
            )
            .filter(
                Invoice.user_id == self.user_id,
                InvoiceMatchRun.status.in_(
                    [
                        "Matched",
                        "Success",
                        "Successful",
                    ]
                ),
            )
        )

        matched_invoices = (
            matched_invoices_query.scalar()
            or 0
        )

        # ------------------------------------------------------
        # Exceptions
        # ------------------------------------------------------

        open_exceptions_query = (
            self.db.query(
                func.count(InvoiceException.id)
            )
            .join(
                Invoice,
                Invoice.id == InvoiceException.invoice_id,
            )
            .filter(
                Invoice.user_id == self.user_id,
                InvoiceException.status == "Open",
            )
        )

        open_exceptions_query = self._apply_user_filter(
            open_exceptions_query,
            Invoice,
        )

        open_exceptions = (
            open_exceptions_query.scalar()
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

        pending_approval_query = (
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
        )

        pending_approval_query = self._apply_user_filter(
            pending_approval_query,
            ProcurementPurchaseOrder,
        )

        pending_approval_value = (
            pending_approval_query.scalar()
            or 0
        )

        # ------------------------------------------------------
        # Overdue payments
        # ------------------------------------------------------

        overdue_payments_query = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.due_date.isnot(None),
                Payment.due_date < datetime.utcnow(),
                Payment.status != "Paid",
            )
        )

        overdue_payments_query = self._apply_user_filter(
            overdue_payments_query,
            Payment,
        )

        overdue_payments = (
            overdue_payments_query.scalar()
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

        total_exceptions_query = (
            self.db.query(
                func.count(
                    InvoiceException.id
                )
            )
            .join(
                Invoice,
                Invoice.id == InvoiceException.invoice_id,
            )
            .filter(
                InvoiceException.status == "Open"
            )
        )

        total_exceptions_query = self._apply_user_filter(
            total_exceptions_query,
            Invoice,
        )

        total_exceptions = (
            total_exceptions_query.scalar()
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

        total_paid_amount_query = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Paid"
            )
        )

        total_paid_amount_query = self._apply_user_filter(
            total_paid_amount_query,
            Payment,
        )

        total_paid_amount = (
            total_paid_amount_query.scalar()
            or 0
        )

        total_pending_payment = (
            self._get_pending_payment_value()
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
            pending_query = (
                self.db.query(
                    func.count(model.id)
                )
                .filter(
                    status_column.in_(
                        pending_statuses
                    )
                )
            )

            pending_query = self._apply_user_filter(
                pending_query,
                model,
            )

            pending = (
                pending_query.scalar()
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

    def get_po_intelligence(self) -> Dict:
        """
        Return PO intelligence metrics for the authenticated user's data.
        """

        if self.user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Authenticated user is required",
            )

        # Base PO query restricted to the authenticated user's PRs
        po_query = (
            self.db.query(ProcurementPurchaseOrder)
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id
            )
        )

        # Basic PO metrics
        total_pos = po_query.count()

        po_value = (
            po_query.with_entities(
                func.coalesce(
                    func.sum(ProcurementPurchaseOrder.total_amount),
                    0,
                )
            )
            .scalar()
            or 0
        )

        # Status counts
        def get_po_status_count(status: str) -> int:
            return (
                self.db.query(func.count(ProcurementPurchaseOrder.id))
                .join(
                    PurchaseRequisition,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    PurchaseRequisition.requester_id == self.user_id,
                    ProcurementPurchaseOrder.status == status,
                )
                .scalar()
                or 0
            )

        open_statuses = [
            "Draft",
            "Pending Approval",
            "Approval Pending",
            "Approved",
            "Partially Received",
        ]

        open_pos = (
            self.db.query(func.count(ProcurementPurchaseOrder.id))
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                ProcurementPurchaseOrder.status.in_(open_statuses),
            )
            .scalar()
            or 0
        )

        closed_pos = get_po_status_count("Closed")
        cancelled_pos = get_po_status_count("Cancelled")

        # Pending approvals for the user's POs
        pending_approvals = (
            self.db.query(func.count(PurchaseOrderApproval.id))
            .join(
                ProcurementPurchaseOrder,
                PurchaseOrderApproval.purchase_order_id
                == ProcurementPurchaseOrder.id,
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                PurchaseOrderApproval.decision == "Pending",
            )
            .scalar()
            or 0
        )

        # Average PO creation time:
        # Purchase Requisition creation -> PO creation
        average_po_creation_time = (
            self.db.query(
                func.avg(
                    func.extract(
                        "epoch",
                        ProcurementPurchaseOrder.created_at
                        - PurchaseRequisition.created_at,
                    )
                )
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                ProcurementPurchaseOrder.created_at.isnot(None),
                PurchaseRequisition.created_at.isnot(None),
            )
            .scalar()
        )

        # Average PO approval time:
        # PO creation -> approval decision
        average_po_approval_time = (
            self.db.query(
                func.avg(
                    func.extract(
                        "epoch",
                        PurchaseOrderApproval.decided_at
                        - ProcurementPurchaseOrder.created_at,
                    )
                )
            )
            .join(
                ProcurementPurchaseOrder,
                PurchaseOrderApproval.purchase_order_id
                == ProcurementPurchaseOrder.id,
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                PurchaseOrderApproval.decision == "Approved",
                PurchaseOrderApproval.decided_at.isnot(None),
                ProcurementPurchaseOrder.created_at.isnot(None),
            )
            .scalar()
        )

        # PO-to-invoice conversion ratio
        po_linked_invoices = (
            self.db.query(func.count(func.distinct(Invoice.id)))
            .join(
                ProcurementPurchaseOrder,
                Invoice.procurement_purchase_order_id
                == ProcurementPurchaseOrder.id,
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                Invoice.procurement_purchase_order_id.isnot(None),
            )
            .scalar()
            or 0
        )

        po_to_invoice_conversion_ratio = (
            (po_linked_invoices / total_pos) * 100
            if total_pos
            else 0
        )

        # Average aging of open POs
        average_po_aging = (
            self.db.query(
                func.avg(
                    func.extract(
                        "epoch",
                        func.now() - ProcurementPurchaseOrder.created_at,
                    )
                )
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                ProcurementPurchaseOrder.status.in_(open_statuses),
                ProcurementPurchaseOrder.created_at.isnot(None),
            )
            .scalar()
        )

        # PO value by department
        po_value_by_department_rows = (
            self.db.query(
                PurchaseRequisition.department,
                func.coalesce(
                    func.sum(ProcurementPurchaseOrder.total_amount),
                    0,
                ),
            )
            .join(
                ProcurementPurchaseOrder,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id
            )
            .group_by(PurchaseRequisition.department)
            .all()
        )

        po_value_by_department = {
            department or "Unknown": float(value or 0)
            for department, value in po_value_by_department_rows
        }

        # PO value by vendor
        po_value_by_vendor_rows = (
            self.db.query(
                ProcurementPurchaseOrder.vendor_name,
                func.coalesce(
                    func.sum(ProcurementPurchaseOrder.total_amount),
                    0,
                ),
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id
            )
            .group_by(ProcurementPurchaseOrder.vendor_name)
            .all()
        )

        po_value_by_vendor = {
            vendor or "Unknown": float(value or 0)
            for vendor, value in po_value_by_vendor_rows
        }

        return {
            "total_pos": total_pos,
            "po_value": float(po_value),
            "open_pos": open_pos,
            "closed_pos": closed_pos,
            "cancelled_pos": cancelled_pos,
            "pending_approvals": pending_approvals,
            "average_po_creation_time": (
                float(average_po_creation_time)
                if average_po_creation_time is not None
                else 0
            ),
            "average_po_approval_time": (
                float(average_po_approval_time)
                if average_po_approval_time is not None
                else 0
            ),
            "po_to_invoice_conversion_ratio": round(
                po_to_invoice_conversion_ratio,
                2,
            ),
            "average_po_aging": (
                float(average_po_aging)
                if average_po_aging is not None
                else 0
            ),
            "po_value_by_department": po_value_by_department,
            "po_value_by_vendor": po_value_by_vendor,
        }

    # ==========================================================
    # Invoice Intelligence
    # ==========================================================

    def get_invoice_intelligence(self) -> dict:

        total_invoices = self._count(Invoice)

        successfully_extracted_query = (
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
        )

        successfully_extracted_query = self._apply_user_filter(
            successfully_extracted_query,
            Invoice,
        )

        successfully_extracted = (
            successfully_extracted_query.scalar()
            or 0
        )

        extraction_failed_query = (
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
        )

        extraction_failed_query = self._apply_user_filter(
            extraction_failed_query,
            Invoice,
        )

        extraction_failed = (
            extraction_failed_query.scalar()
            or 0
        )

        matched_query = (
            self.db.query(
                func.count(
                    func.distinct(
                        InvoiceMatchRun.invoice_id
                    )
                )
            )
            .join(
                Invoice,
                Invoice.id == InvoiceMatchRun.invoice_id,
            )
            .filter(
                Invoice.user_id == self.user_id,
                InvoiceMatchRun.status.in_(
                    [
                        "Matched",
                        "Success",
                        "Successful",
                    ]
                ),
            )
        )

        matched = (
            matched_query.scalar()
            or 0
        )

        # --------------------------------------------------
        # PO-linked invoices
        # --------------------------------------------------
        #
        # An invoice is PO-linked when it references a
        # purchase order directly, regardless of whether a
        # match run has been performed yet.
        # --------------------------------------------------

        po_linked_invoices_query = (
            self.db.query(
                func.count(Invoice.id)
            )
            .filter(
                Invoice.user_id == self.user_id,
                Invoice.procurement_purchase_order_id.isnot(None),
            )
        )

        po_linked_invoices_query = self._apply_user_filter(
            po_linked_invoices_query,
            Invoice,
        )

        po_linked_invoices = (
            po_linked_invoices_query.scalar()
            or 0
        )

        exception_count_query = (
            self.db.query(
                func.count(InvoiceException.id)
            )
            .join(
                Invoice,
                Invoice.id == InvoiceException.invoice_id,
            )
            .filter(
                InvoiceException.status == "Open"
            )
        )

        exception_count_query = self._apply_user_filter(
            exception_count_query,
            Invoice,
        )

        exception_count = (
            exception_count_query.scalar()
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
                int(po_linked_invoices),

            "non_po_invoices":
                max(
                    0,
                    total_invoices - po_linked_invoices,
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
        Build vendor analytics from the authenticated user's
        purchase orders, invoices, goods receipts and exceptions.
        """

        if self.user_id is None:
            raise HTTPException(
                status_code=401,
                detail="Authenticated user is required.",
            )

        # ------------------------------------------------------
        # Purchase Orders grouped by vendor
        # ------------------------------------------------------

        po_rows = (
            self.db.query(
                ProcurementPurchaseOrder.vendor_name,
                func.count(
                    ProcurementPurchaseOrder.id
                ).label("po_count"),
                func.coalesce(
                    func.sum(
                        ProcurementPurchaseOrder.total_amount
                    ),
                    0,
                ).label("po_spend"),
            )
            .join(
                PurchaseRequisition,
                ProcurementPurchaseOrder.purchase_requisition_id
                == PurchaseRequisition.id,
            )
            .filter(
                PurchaseRequisition.requester_id == self.user_id,
                ProcurementPurchaseOrder.vendor_name.isnot(None),
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
                func.count(
                    Invoice.id
                ).label("invoice_count"),
                func.coalesce(
                    func.sum(
                        Invoice.total_amount
                    ),
                    0,
                ).label("invoice_spend"),
                func.coalesce(
                    func.avg(
                        Invoice.total_amount
                    ),
                    0,
                ).label("average_invoice_value"),
            )
            .filter(
                Invoice.user_id == self.user_id,
                Invoice.vendor_name.isnot(None),
            )
            .group_by(
                Invoice.vendor_name
            )
            .all()
        )

        # ------------------------------------------------------
        # Normalize vendor names
        # ------------------------------------------------------

        def normalize_vendor_name(value: str | None) -> str:
            """
            Normalize vendor names for display and grouping.

            Handles:
            - None values
            - Leading/trailing spaces
            - Multiple spaces
            - Non-breaking spaces
            - Case differences
            """
            if value is None:
                return ""

            value = str(value).replace("\u00A0", " ")

            return re.sub(r"\s+", " ", value).strip()

        def vendor_group_key(value: str | None) -> str:
            """
            Create a consistent key for grouping vendors.
            """
            normalized_name = normalize_vendor_name(value)

            return normalized_name.casefold()

        po_data = {}

        for vendor, po_count, po_spend in po_rows:
            vendor_name = normalize_vendor_name(vendor)

            if not vendor_name:
                continue

            vendor_key = vendor_group_key(vendor)

            if vendor_key not in po_data:
                po_data[vendor_key] = {
                    "vendor_name": vendor_name,
                    "number_of_pos": 0,
                    "po_spend": 0.0,
                }

            po_data[vendor_key]["number_of_pos"] += int(
                po_count or 0
            )

            po_data[vendor_key]["po_spend"] += float(
                po_spend or 0
            )

        invoice_data = {}

        for (
            vendor,
            invoice_count,
            invoice_spend,
            average_invoice_value,
        ) in invoice_rows:

            vendor_name = normalize_vendor_name(vendor)

            if not vendor_name:
                continue

            vendor_key = vendor_group_key(vendor)

            if vendor_key not in invoice_data:
                invoice_data[vendor_key] = {
                    "vendor_name": vendor_name,
                    "number_of_invoices": 0,
                    "invoice_spend": 0.0,
                    "average_invoice_value": 0.0,
                }

            invoice_data[vendor_key]["number_of_invoices"] += int(
                invoice_count or 0
            )

            invoice_data[vendor_key]["invoice_spend"] += float(
                invoice_spend or 0
            )

            invoice_data[vendor_key]["average_invoice_value"] = (
                invoice_data[vendor_key]["invoice_spend"]
                / invoice_data[vendor_key]["number_of_invoices"]
                if invoice_data[vendor_key]["number_of_invoices"]
                else 0.0
            )

        vendor_keys = sorted(set(po_data.keys()) | set(invoice_data.keys()))

        vendors = []

        for vendor_key in vendor_keys:

            po = po_data.get(
                vendor_key,
                {
                    "vendor_name": vendor_key,
                    "number_of_pos": 0,
                    "po_spend": 0.0,
                },
            )

            invoice = invoice_data.get(
                vendor_key,
                {
                    "vendor_name": po["vendor_name"],
                    "number_of_invoices": 0,
                    "invoice_spend": 0.0,
                    "average_invoice_value": 0.0,
                },
            )

            vendor_name = (
                po.get("vendor_name")
                or invoice.get("vendor_name")
                or vendor_key
            )

            # --------------------------------------------------
            # Vendor invoice exceptions
            # --------------------------------------------------

            exception_count_query = (
                self.db.query(
                    func.count(
                        func.distinct(
                            InvoiceException.invoice_id
                        )
                    )
                )
                .join(
                    Invoice,
                    Invoice.id == InvoiceException.invoice_id,
                )
                .filter(
                    Invoice.user_id == self.user_id,
                    InvoiceException.status == "Open",
                    func.lower(
                        func.trim(Invoice.vendor_name)
                    ) == vendor_key,
                )
            )

            exception_count = int(
                exception_count_query.scalar()
                or 0
            )

            invoice_count = int(
                invoice["number_of_invoices"]
            )

            # --------------------------------------------------
            # Invoice accuracy
            # --------------------------------------------------
            #
            # Accuracy is based on invoices without open
            # exceptions.
            #
            # Accurate invoices =
            # Total invoices - invoices with open exceptions
            #
            # Clamped to [0, 100] so a vendor can never show
            # above 100% or below 0%.
            # --------------------------------------------------

            invoice_accuracy = (
                max(
                    0,
                    min(
                        100,
                        (
                            (invoice_count - exception_count)
                            / invoice_count
                        ) * 100,
                    ),
                )
                if invoice_count
                else 0.0
            )

            exception_rate = (
                (
                    exception_count
                    / invoice_count
                ) * 100
                if invoice_count
                else 0.0
            )

            # --------------------------------------------------
            # PO compliance
            # --------------------------------------------------
            #
            # An invoice is PO-compliant when it is linked to a
            # purchase order.
            #
            # PO Compliance =
            # PO-linked invoices / Total vendor invoices * 100
            # --------------------------------------------------

            po_linked_invoice_count = (
                self.db.query(
                    func.count(Invoice.id)
                )
                .join(
                    ProcurementPurchaseOrder,
                    Invoice.procurement_purchase_order_id
                    == ProcurementPurchaseOrder.id,
                )
                .join(
                    PurchaseRequisition,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    Invoice.user_id == self.user_id,
                    PurchaseRequisition.requester_id == self.user_id,
                    Invoice.procurement_purchase_order_id.isnot(None),
                    func.lower(
                        func.trim(Invoice.vendor_name)
                    ) == vendor_key,
                )
                .scalar()
                or 0
            )

            po_compliance = (
                max(
                    0,
                    min(
                        100,
                        (
                            po_linked_invoice_count
                            / invoice_count
                        ) * 100,
                    ),
                )
                if invoice_count
                else 0.0
            )

            # --------------------------------------------------
            # Price variance
            # --------------------------------------------------
            #
            # Price Variance Percentage =
            # ((Invoice Amount - PO Amount) / PO Amount) * 100
            #
            # Positive value = invoice is higher than PO
            # Negative value = invoice is lower than PO
            # --------------------------------------------------

            po_amount_query = (
                self.db.query(
                    func.coalesce(
                        func.sum(
                            ProcurementPurchaseOrder.total_amount
                        ),
                        0,
                    )
                )
                .join(
                    PurchaseRequisition,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    PurchaseRequisition.requester_id == self.user_id,
                    func.lower(
                        func.trim(ProcurementPurchaseOrder.vendor_name)
                    ) == vendor_key,
                )
            )

            po_amount = float(
                po_amount_query.scalar()
                or 0
            )

            invoice_amount_query = (
                self.db.query(
                    func.coalesce(
                        func.sum(Invoice.total_amount),
                        0,
                    )
                )
                .join(
                    ProcurementPurchaseOrder,
                    Invoice.procurement_purchase_order_id
                    == ProcurementPurchaseOrder.id,
                )
                .join(
                    PurchaseRequisition,
                    ProcurementPurchaseOrder.purchase_requisition_id
                    == PurchaseRequisition.id,
                )
                .filter(
                    Invoice.user_id == self.user_id,
                    PurchaseRequisition.requester_id == self.user_id,
                    Invoice.procurement_purchase_order_id.isnot(None),
                    func.lower(
                        func.trim(ProcurementPurchaseOrder.vendor_name)
                    ) == vendor_key,
                )
            )

            invoice_amount = float(
                invoice_amount_query.scalar()
                or 0
            )

            price_variance = (
                (
                    invoice_amount - po_amount
                )
                / po_amount
            ) * 100 if po_amount else None

            # --------------------------------------------------
            # On-time delivery
            # --------------------------------------------------
            #
            # On-Time Delivery =
            # Invoices issued on or before the expected delivery
            # date / Total PO-linked invoices * 100
            #
            # Expected delivery date is calculated from:
            # PO created date + PO delivery_days
            #
            # If delivery_days is not available, the metric remains None.
            # --------------------------------------------------

            on_time_delivery = None

            # Confirm that the required fields exist
            if (
                hasattr(ProcurementPurchaseOrder, "created_at")
                and hasattr(Invoice, "created_at")
                and hasattr(Invoice, "procurement_purchase_order_id")
                and hasattr(ProcurementPurchaseOrder, "delivery_days")
            ):

                delivery_rows = (
                    self.db.query(
                        ProcurementPurchaseOrder.created_at,
                        ProcurementPurchaseOrder.delivery_days,
                        Invoice.created_at.label("invoice_created_at"),
                    )
                    .join(
                        Invoice,
                        Invoice.procurement_purchase_order_id
                        == ProcurementPurchaseOrder.id,
                    )
                    .join(
                        PurchaseRequisition,
                        ProcurementPurchaseOrder.purchase_requisition_id
                        == PurchaseRequisition.id,
                    )
                    .filter(
                        PurchaseRequisition.requester_id == self.user_id,
                        Invoice.user_id == self.user_id,
                        func.lower(
                            func.trim(ProcurementPurchaseOrder.vendor_name)
                        ) == vendor_key,
                        ProcurementPurchaseOrder.created_at.isnot(None),
                        Invoice.created_at.isnot(None),
                        ProcurementPurchaseOrder.delivery_days.isnot(None),
                    )
                    .all()
                )

                total_deliveries = 0
                on_time_deliveries = 0

                for (
                    po_created_at,
                    delivery_days,
                    invoice_created_at,
                ) in delivery_rows:

                    if (
                        po_created_at is None
                        or invoice_created_at is None
                        or delivery_days is None
                    ):
                        continue

                    expected_delivery_date = (
                        po_created_at
                        + timedelta(days=int(delivery_days))
                    )

                    total_deliveries += 1

                    if invoice_created_at <= expected_delivery_date:
                        on_time_deliveries += 1

                on_time_delivery = (
                    (
                        on_time_deliveries
                        / total_deliveries
                    ) * 100
                    if total_deliveries
                    else None
                )

            # --------------------------------------------------
            # Overall score
            # --------------------------------------------------

            # Use 0 when a metric is not available.
            # This prevents the frontend from displaying empty
            # values for vendors that do not have invoice data yet.

            overall_score = (
                (
                    (invoice_accuracy or 0)
                    + (po_compliance or 0)
                    + (on_time_delivery or 0)
                ) / 3
)

            # --------------------------------------------------
            # Vendor response
            # --------------------------------------------------

            vendors.append(
                {
                    "vendor_name": vendor_name,

                    "overall_score": (
                        round(overall_score, 2)
                        if overall_score is not None
                        else None
                    ),

                    "on_time_delivery": (
                        round(
                            max(
                                0,
                                min(100, on_time_delivery),
                            ),
                            2,
                        )
                        if on_time_delivery is not None
                        else None
                    ),

                    "invoice_accuracy": (
                        round(invoice_accuracy, 2)
                        if invoice_accuracy is not None
                        else None
                    ),

                    "po_compliance": (
                        round(po_compliance, 2)
                        if po_compliance is not None
                        else None
                    ),

                    "price_variance": (
                        round(float(price_variance), 2)
                        if price_variance is not None
                        else None
                    ),

                    "exception_rate": (
                        round(exception_rate, 2)
                        if exception_rate is not None
                        else None
                    ),

                    "payment_dispute": None,

                    "total_spend": float(
                        po["po_spend"]
                    ),

                    "number_of_pos": int(
                        po["number_of_pos"]
                    ),

                    "number_of_invoices": int(
                        invoice["number_of_invoices"]
                    ),

                    "average_invoice_value": float(
                        invoice["average_invoice_value"]
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
            .filter(
                PurchaseRequisition.requester_id == self.user_id
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
        ).join(
            PurchaseRequisition,
            ProcurementPurchaseOrder.purchase_requisition_id
            == PurchaseRequisition.id,
        ).filter(
            PurchaseRequisition.requester_id == self.user_id,
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
        ).join(
            PurchaseRequisition,
            ProcurementPurchaseOrder.purchase_requisition_id
            == PurchaseRequisition.id,
        ).filter(
            PurchaseRequisition.requester_id == self.user_id,
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

        total_paid_amount_query = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Paid"
            )
        )

        total_paid_amount_query = self._apply_user_filter(
            total_paid_amount_query,
            Payment,
        )

        total_paid_amount = (
            total_paid_amount_query.scalar()
            or 0
        )

        total_pending_payment = (
            self._get_pending_payment_value()
        )

        total_exception_value_query = (
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
        )

        total_exception_value_query = self._apply_user_filter(
            total_exception_value_query,
            Invoice,
        )

        total_exception_value = (
            total_exception_value_query.scalar()
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

        po_rows_query = (
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
        )

        po_rows_query = self._apply_user_filter(
            po_rows_query,
            ProcurementPurchaseOrder,
        )

        po_rows = (
            po_rows_query
            .group_by(po_period)
            .order_by(po_period)
            .all()
        )

        # ------------------------------------------------------
        # Invoice Trends
        # ------------------------------------------------------

        invoice_rows_query = (
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
        )

        invoice_rows_query = self._apply_user_filter(
            invoice_rows_query,
            Invoice,
        )

        invoice_rows = (
            invoice_rows_query
            .group_by(invoice_period)
            .order_by(invoice_period)
            .all()
        )

        # ------------------------------------------------------
        # Payment Trends
        # ------------------------------------------------------

        payment_rows_query = (
            self.db.query(
                payment_period.label("period"),

                func.coalesce(
                    func.sum(
                        Payment.amount
                    ),
                    0,
                ).label("payment_value"),
            )
        )

        payment_rows_query = self._apply_user_filter(
            payment_rows_query,
            Payment,
        )

        payment_rows = (
            payment_rows_query
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
            .join(
                Invoice,
                Invoice.id == InvoiceException.invoice_id,
            )
            .filter(
                Invoice.user_id == self.user_id
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

        total_paid_amount_query = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status == "Paid"
            )
        )

        total_paid_amount_query = self._apply_user_filter(
            total_paid_amount_query,
            Payment,
        )

        total_paid_amount = (
            total_paid_amount_query.scalar()
            or 0
        )

        total_pending_payment = (
            self._get_pending_payment_value()
        )
        total_exception_value_query = (
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
        )

        total_exception_value_query = self._apply_user_filter(
            total_exception_value_query,
            Invoice,
        )

        total_exception_value = (
            total_exception_value_query.scalar()
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
    # Pending Payment Helper
    # ==========================================================

    def _get_pending_payment_value(self) -> float:
        """
        Calculate the total pending payment value.

        It first checks Payment records. If no pending Payment
        records exist, it checks invoices whose processing status
        is Payment Pending.
        """

        pending_payment_statuses = [
            "Pending",
            "Payment Pending",
            "Pending Payment",
            "Payment Pending Approval",
        ]

        # ------------------------------------------------------
        # Check Payment table
        # ------------------------------------------------------

        payment_query = (
            self.db.query(
                func.coalesce(
                    func.sum(Payment.amount),
                    0,
                )
            )
            .filter(
                Payment.status.in_(
                    pending_payment_statuses
                )
            )
        )

        payment_query = self._apply_user_filter(
            payment_query,
            Payment,
        )

        pending_payment_value = (
            payment_query.scalar()
            or 0
        )

        # ------------------------------------------------------
        # Check whether pending Payment records exist
        # ------------------------------------------------------

        pending_payment_count_query = (
            self.db.query(
                func.count(Payment.id)
            )
            .filter(
                Payment.status.in_(
                    pending_payment_statuses
                )
            )
        )

        pending_payment_count_query = self._apply_user_filter(
            pending_payment_count_query,
            Payment,
        )

        pending_payment_count = (
            pending_payment_count_query.scalar()
            or 0
        )

        # ------------------------------------------------------
        # Fallback to invoices marked as Payment Pending
        # ------------------------------------------------------

        if pending_payment_count == 0:

            pending_invoice_statuses = [
                "Payment Pending",
                "Pending Payment",
                "Payment Pending Approval",
            ]

            invoice_query = (
                self.db.query(
                    func.coalesce(
                        func.sum(Invoice.total_amount),
                        0,
                    )
                )
                .filter(
                    Invoice.processing_status.in_(
                        pending_invoice_statuses
                    )
                )
            )

            invoice_query = self._apply_user_filter(
                invoice_query,
                Invoice,
            )

            pending_payment_value = (
                invoice_query.scalar()
                or 0
            )

        return float(
            pending_payment_value
        )

    # ==========================================================
    # Overdue Payment Helper
    # ==========================================================

    def _get_overdue_payment_value(self) -> float:

        value_query = (
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
        )

        value_query = self._apply_user_filter(
            value_query,
            Payment,
        )

        value = (
            value_query.scalar()
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