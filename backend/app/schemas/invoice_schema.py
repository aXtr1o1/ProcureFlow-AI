from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Current Invoice Status
# ==========================================================
class CurrentInvoiceStatusResponse(BaseModel):
    invoice_id: int
    invoice_number: str
    processing_status: str

    model_config = ConfigDict(
        from_attributes=True
    )


# ==========================================================
# Invoice Status History
# ==========================================================
class InvoiceStatusResponse(BaseModel):
    invoice_id: int
    status: str
    remarks: Optional[str]
    updated_by: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

class InvoiceDetailResponse(BaseModel):
    id: int
    invoice_number: str
    vendor_name: str | None = None
    customer_name: str | None = None

    invoice_date: str | None = None
    due_date: str | None = None

    currency: str | None = None

    total_amount: float | None = None

    processing_status: str

    blob_url: str | None = None      # <-- NEW

    model_config = ConfigDict(
        from_attributes=True
    )

# ==========================================================
# Link Invoice to Purchase Order
# ==========================================================
class InvoicePurchaseOrderLinkRequest(BaseModel):
    purchase_order_id: int