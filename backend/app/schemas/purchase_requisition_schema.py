from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ==========================================================
# Purchase Requisition Line Create
# ==========================================================
class PurchaseRequisitionLineCreate(BaseModel):
    description: str = Field(
        min_length=1,
        max_length=500
    )
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)


# ==========================================================
# Purchase Requisition Create
# ==========================================================
class PurchaseRequisitionCreate(BaseModel):
    business_need_id: int = Field(gt=0)

    title: str = Field(
        min_length=1,
        max_length=255
    )

    justification: Optional[str] = Field(
        default=None,
        max_length=2000
    )

    line_items: list[PurchaseRequisitionLineCreate] = Field(
        min_length=1
    )


# ==========================================================
# Vendor Selection
# ==========================================================
class VendorSelectionRequest(BaseModel):
    vendor_name: str = Field(
        min_length=1,
        max_length=255
    )


# ==========================================================
# Negotiation Outcome
# ==========================================================
class NegotiationOutcomeRequest(BaseModel):
    negotiated_amount: float = Field(gt=0)

    remarks: Optional[str] = Field(
        default=None,
        max_length=1000
    )


# ==========================================================
# PR Approval / Rejection
# ==========================================================
class PurchaseRequisitionDecisionRequest(BaseModel):
    remarks: Optional[str] = Field(
        default=None,
        max_length=1000
    )


# ==========================================================
# PR Line Response
# ==========================================================
class PurchaseRequisitionLineResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    description: str
    quantity: float
    unit_price: float
    amount: float


# ==========================================================
# PR Approval Response
# ==========================================================
class PurchaseRequisitionApprovalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    decision: str
    remarks: Optional[str]
    decided_at: datetime


# ==========================================================
# Purchase Requisition Response
# ==========================================================
class PurchaseRequisitionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    pr_number: str
    business_need_id: int
    title: str
    justification: Optional[str]

    currency: str
    total_amount: float

    selected_vendor_name: Optional[str]

    negotiated_amount: Optional[float]
    price_variance: Optional[float]
    price_variance_percentage: Optional[float]

    negotiation_remarks: Optional[str]
    negotiated_at: Optional[datetime]

    status: str

    created_at: datetime
    updated_at: datetime

    line_items: list[PurchaseRequisitionLineResponse]
    approvals: list[PurchaseRequisitionApprovalResponse]