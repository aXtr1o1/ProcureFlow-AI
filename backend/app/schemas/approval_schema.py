from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Approve Invoice Request
# ==========================================================
class ApproveInvoiceRequest(BaseModel):
    approved_by: str


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