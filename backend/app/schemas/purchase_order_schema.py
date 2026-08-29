from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict

class PurchaseOrderStatus(str, Enum):
    CREATED = "Created"
    PENDING_APPROVAL = "Pending Approval"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    SENT = "Sent"
    VENDOR_ACCEPTED = "Vendor Accepted"
    VENDOR_REJECTED = "Vendor Rejected"
    CLOSED = "Closed"
    CANCELLED = "Cancelled"

# ==========================================================
# Update Purchase Order Status
# ==========================================================
class PurchaseOrderStatusUpdate(BaseModel):
    status: PurchaseOrderStatus


class PurchaseOrderDecisionRequest(BaseModel):
    remarks: str | None = None


class PurchaseOrderVendorResponseRequest(BaseModel):
    remarks: str | None = None


# ==========================================================
# Purchase Order Response
# ==========================================================
class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    po_number: str
    purchase_requisition_id: int
    vendor_name: str
    currency: str
    subtotal: float
    tax: float
    total_amount: float
    status: PurchaseOrderStatus
    created_at: datetime
