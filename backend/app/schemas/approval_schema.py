from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Editable line item (approval)
# ==========================================================
class ApprovalLineItemEdit(BaseModel):
    id: int
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None


# ==========================================================
# Editable invoice fields (approval)
# ==========================================================
class ApprovalInvoiceEdit(BaseModel):
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    customer_name: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    purchase_order_number: Optional[str] = None
    currency: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total_amount: Optional[float] = None
    line_items: Optional[List[ApprovalLineItemEdit]] = None


# ==========================================================
# Approve Invoice Request
# ==========================================================
class ApproveInvoiceRequest(BaseModel):
    approved_by: str
    invoice_edits: Optional[ApprovalInvoiceEdit] = None


# ==========================================================
# Reject Invoice Request
# ==========================================================
class RejectInvoiceRequest(BaseModel):
    rejected_by: str
    reason: str


# ==========================================================
# Approval Response
# ==========================================================
class ApprovalResponse(BaseModel):
    success: bool
    invoice_id: int
    status: str
    message: str


# ==========================================================
# Approval History Response
# ==========================================================

class ApprovalHistoryResponse(BaseModel):
    invoice_id: int
    reviewer: str
    decision: str
    remarks: Optional[str]
    approved_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )
