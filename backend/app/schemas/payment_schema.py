from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


# ==========================================================
# Payment Create
# ==========================================================

class PaymentCreate(BaseModel):
    """
    Request schema for creating a payment against an invoice.
    """

    invoice_id: int = Field(
        ...,
        gt=0,
    )

    payment_reference: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    payment_method: Optional[str] = Field(
        default=None,
        max_length=100,
    )

    amount: float = Field(
        ...,
        gt=0,
    )

    currency: str = Field(
        default="USD",
        min_length=1,
        max_length=20,
    )

    payment_date: Optional[datetime] = None

    due_date: Optional[datetime] = None

    remarks: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# ==========================================================
# Payment Status Update
# ==========================================================

class PaymentStatusUpdate(BaseModel):
    """
    Request schema for updating payment status.
    """

    status: str = Field(
        ...,
        min_length=1,
        max_length=100,
    )

    remarks: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    payment_date: Optional[datetime] = None


# ==========================================================
# Payment Response
# ==========================================================

class PaymentResponse(BaseModel):
    """
    Payment response returned by the API.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int

    invoice_id: int

    payment_reference: Optional[str] = None

    payment_method: Optional[str] = None

    amount: float

    currency: str

    status: str

    payment_date: Optional[datetime] = None

    due_date: Optional[datetime] = None

    remarks: Optional[str] = None

    created_by_id: int

    created_at: datetime

    updated_at: datetime