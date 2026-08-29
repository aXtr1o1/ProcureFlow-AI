from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ExceptionAssignmentRequest(BaseModel):
    assigned_to_id: int = Field(gt=0)


class ExceptionResolutionRequest(BaseModel):
    remarks: str = Field(min_length=1, max_length=1000)


class InvoiceExceptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    invoice_id: int
    purchase_order_id: int
    match_run_id: int
    status: str
    assigned_to_id: Optional[int]
    resolution_remarks: Optional[str]
    resolved_by_id: Optional[int]
    resolved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
