from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Executive Dashboard
# ==========================================================

class DashboardKPIResponse(BaseModel):
    """
    Executive-level procurement dashboard KPIs.
    """

    # Client requested KPIs
    total_procurement_value: float = 0.0
    active_pos: int = 0
    invoices_processed: int = 0
    pending_invoices: int = 0
    matched_invoices: int = 0
    exception_rate: float = 0.0
    pending_approval_value: float = 0.0
    average_processing_time: Optional[float] = None
    potential_savings: float = 0.0
    overdue_payments: float = 0.0

    # Supporting workflow counts
    total_business_needs: int = 0
    total_purchase_requisitions: int = 0
    total_purchase_orders: int = 0
    total_goods_receipts: int = 0
    total_invoices: int = 0
    total_payments: int = 0
    total_exceptions: int = 0

    # Supporting financial values
    total_po_value: float = 0.0
    total_invoice_value: float = 0.0
    total_paid_amount: float = 0.0
    total_pending_payment: float = 0.0


# ==========================================================
# Generic Status Response
# ==========================================================

class DashboardStatusResponse(BaseModel):
    status: str
    count: int


# ==========================================================
# Procurement Funnel
# ==========================================================

class DashboardFunnelStageResponse(BaseModel):
    """
    Metrics for one stage of the procurement lifecycle.
    """

    count: int = 0
    value: float = 0.0
    average_time: Optional[float] = None
    pending: int = 0
    sla_breaches: int = 0


class DashboardFunnelResponse(BaseModel):
    """
    Procurement lifecycle funnel.

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

    business_needs: DashboardFunnelStageResponse
    purchase_requisitions: DashboardFunnelStageResponse
    purchase_orders: DashboardFunnelStageResponse
    goods_receipts: DashboardFunnelStageResponse
    invoices: DashboardFunnelStageResponse
    payments: DashboardFunnelStageResponse


# ==========================================================
# PO Intelligence
# ==========================================================

class POIntelligenceResponse(BaseModel):
    """
    Purchase Order intelligence metrics.
    """

    total_pos: int = 0
    po_value: float = 0.0

    open_pos: int = 0
    closed_pos: int = 0
    cancelled_pos: int = 0

    pending_approvals: int = 0

    average_po_creation_time: Optional[float] = None
    average_po_approval_time: Optional[float] = None

    po_to_invoice_conversion_ratio: float = 0.0

    average_po_aging: Optional[float] = None

    po_value_by_department: Dict[str, float] = {}
    po_value_by_vendor: Dict[str, float] = {}


# ==========================================================
# Invoice Intelligence
# ==========================================================

class InvoiceIntelligenceResponse(BaseModel):
    """
    Invoice processing and matching intelligence.
    """

    total_invoices_received: int = 0
    successfully_extracted: int = 0
    extraction_failed: int = 0

    extraction_confidence: Optional[float] = None

    duplicate_invoices: int = 0
    missing_fields: int = 0

    po_linked_invoices: int = 0
    non_po_invoices: int = 0

    processing_time: Optional[float] = None
    manual_review_time: Optional[float] = None

    matched_invoices: int = 0
    unmatched_invoices: int = 0

    exception_count: int = 0
    exception_rate: float = 0.0


# ==========================================================
# Vendor Intelligence
# ==========================================================

class VendorIntelligenceItem(BaseModel):
    """
    Intelligence metrics for an individual vendor.
    """

    vendor_name: str

    overall_score: Optional[float] = None
    on_time_delivery: Optional[float] = None
    invoice_accuracy: Optional[float] = None
    po_compliance: Optional[float] = None

    # None means that a valid PO/invoice comparison
    # is not available.
    price_variance: Optional[float] = None

    exception_rate: Optional[float] = None
    payment_dispute: Optional[float] = None

    total_spend: float = 0.0
    number_of_pos: int = 0
    number_of_invoices: int = 0

    average_invoice_value: float = 0.0
    payment_terms: Optional[str] = None
    average_payment_time: Optional[float] = None


class VendorIntelligenceResponse(BaseModel):
    """
    Vendor intelligence and vendor-level analytics.
    """

    vendors: List[VendorIntelligenceItem] = []

    total_vendor_spend: float = 0.0
    total_vendors: int = 0


# ==========================================================
# Spend Analytics
# ==========================================================

class SpendAnalyticsResponse(BaseModel):
    """
    Procurement spend analytics.
    """

    total_spend: float = 0.0

    by_department: Dict[str, float] = {}
    by_business_unit: Dict[str, float] = {}
    by_category: Dict[str, float] = {}
    by_vendor: Dict[str, float] = {}
    by_location: Dict[str, float] = {}
    by_month: Dict[str, float] = {}
    by_quarter: Dict[str, float] = {}
    by_project: Dict[str, float] = {}
    by_cost_center: Dict[str, float] = {}

    total_po_value: float = 0.0
    total_invoice_value: float = 0.0
    total_paid_amount: float = 0.0
    total_pending_payment: float = 0.0
    total_exception_value: float = 0.0

    potential_savings: float = 0.0


# ==========================================================
# PO Trend Analytics
# ==========================================================

class POTrendItem(BaseModel):
    """
    Time-series procurement analytics for one period.
    """

    period: str

    po_value: float = 0.0
    invoice_value: float = 0.0
    payment_value: float = 0.0

    number_of_pos: int = 0
    number_of_invoices: int = 0

    exceptions: int = 0
    savings: float = 0.0


class POTrendResponse(BaseModel):
    """
    Purchase Order and procurement trend analytics.
    """

    trends: List[POTrendItem] = []


# ==========================================================
# Spend / Financial Summary
# ==========================================================

class DashboardSpendResponse(BaseModel):
    """
    Financial summary for the procurement lifecycle.
    """

    total_po_value: float = 0.0
    total_invoice_value: float = 0.0
    total_paid_amount: float = 0.0
    total_pending_payment: float = 0.0

    total_exception_value: float = 0.0
    potential_savings: float = 0.0

    overdue_payment_value: float = 0.0


# ==========================================================
# Complete Dashboard Overview
# ==========================================================

class DashboardOverviewResponse(BaseModel):
    """
    Complete centralized dashboard response.

    Used by the frontend dashboard and analytics screens.
    """

    model_config = ConfigDict(from_attributes=True)

    # ------------------------------------------------------
    # Screen 1
    # Executive Dashboard
    # ------------------------------------------------------
    kpis: DashboardKPIResponse

    # ------------------------------------------------------
    # Workflow status distributions
    # ------------------------------------------------------
    business_need_status: Dict[str, int] = {}
    purchase_requisition_status: Dict[str, int] = {}
    purchase_order_status: Dict[str, int] = {}
    goods_receipt_status: Dict[str, int] = {}
    invoice_status: Dict[str, int] = {}
    payment_status: Dict[str, int] = {}

    # ------------------------------------------------------
    # Screen 2
    # Procurement Cycle Funnel
    # ------------------------------------------------------
    funnel: DashboardFunnelResponse

    # ------------------------------------------------------
    # Screen 3
    # PO Intelligence
    # ------------------------------------------------------
    po_intelligence: POIntelligenceResponse

    # ------------------------------------------------------
    # Screen 4
    # Invoice Intelligence
    # ------------------------------------------------------
    invoice_intelligence: InvoiceIntelligenceResponse

    # ------------------------------------------------------
    # Screen 5A
    # Vendor Intelligence
    # ------------------------------------------------------
    vendor_intelligence: VendorIntelligenceResponse

    # ------------------------------------------------------
    # Screen 5B
    # Spend Analytics
    # ------------------------------------------------------
    spend_analytics: SpendAnalyticsResponse

    # ------------------------------------------------------
    # Screen 6
    # PO Trend Analytics
    # ------------------------------------------------------
    po_trends: POTrendResponse

    # ------------------------------------------------------
    # Financial summary
    # ------------------------------------------------------
    spend: DashboardSpendResponse