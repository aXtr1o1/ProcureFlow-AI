from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Current Invoice Status
# ==========================================================
class CurrentInvoiceStatusResponse(BaseModel):
    id: int
    invoice_number: Optional[str]
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
    updated_by: Optional[str]
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )