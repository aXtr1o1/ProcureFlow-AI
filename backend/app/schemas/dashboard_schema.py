from typing import Dict

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Dashboard KPI Response
# ==========================================================

class DashboardKPIResponse(BaseModel):
    """
    High-level procurement and invoice KPIs.
    """

    total_business_needs: int
    total_purchase_requisitions: int
    total_purchase_orders: int
    total_goods_receipts: int
    total_invoices: int
    total_payments: int
    total_exceptions: int

    total_po_value: float
    total_invoice_value: float
    total_paid_amount: float
    total_pending_payment: float


# ==========================================================
# Dashboard Status Response
# ==========================================================

class DashboardStatusResponse(BaseModel):
    """
    Status distribution for a workflow entity.
    """

    status: str
    count: int


# ==========================================================
# Dashboard Funnel Response
# ==========================================================

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

    business_needs: int
    purchase_requisitions: int
    purchase_orders: int
    goods_receipts: int
    invoices: int
    payments: int


# ==========================================================
# Dashboard Spend Response
# ==========================================================

class DashboardSpendResponse(BaseModel):
    """
    Financial summary for the procurement lifecycle.
    """

    total_po_value: float
    total_invoice_value: float
    total_paid_amount: float
    total_pending_payment: float
    total_exception_value: float


# ==========================================================
# Dashboard Overview Response
# ==========================================================

class DashboardOverviewResponse(BaseModel):
    """
    Complete dashboard response used by the frontend.
    """

    model_config = ConfigDict(from_attributes=True)

    kpis: DashboardKPIResponse

    business_need_status: Dict[str, int]
    purchase_requisition_status: Dict[str, int]
    purchase_order_status: Dict[str, int]
    goods_receipt_status: Dict[str, int]
    invoice_status: Dict[str, int]
    payment_status: Dict[str, int]

    funnel: DashboardFunnelResponse

    spend: DashboardSpendResponse