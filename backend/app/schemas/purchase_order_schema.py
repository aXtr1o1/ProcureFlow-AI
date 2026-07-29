from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Create Purchase Order
# ==========================================================
class PurchaseOrderCreate(BaseModel):
    invoice_id: int

    po_number: str

    vendor_name: str

    customer_name: str

    currency: str

    subtotal: float

    tax: float

    total_amount: float

    blob_name: Optional[str] = None

    blob_url: Optional[str] = None

    status: Optional[str] = "Approved"


# ==========================================================
# Update Purchase Order Status
# ==========================================================
class PurchaseOrderStatusUpdate(BaseModel):
    status: str


# ==========================================================
# Purchase Order Response
# ==========================================================
class PurchaseOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_id: int
    po_number: str
    vendor_name: str
    customer_name: str
    currency: str
    subtotal: float
    tax: float
    total_amount: float
    blob_name: Optional[str]
    blob_url: Optional[str]
    status: str
    generated_at: datetime