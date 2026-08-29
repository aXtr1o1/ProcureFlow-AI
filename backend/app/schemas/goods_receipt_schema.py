from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


# ==========================================================
# Goods Receipt Line
# ==========================================================

class GoodsReceiptLineCreate(BaseModel):
    """
    Data required to create a Goods Receipt line.

    The ordered quantity is obtained from the Purchase Order
    line by the backend.
    """

    purchase_order_line_id: int = Field(
        ...,
        gt=0,
    )

    description: Optional[str] = Field(
        default=None,
        min_length=1,
        max_length=500,
    )

    received_quantity: float = Field(
        ...,
        ge=0,
    )

    accepted_quantity: float = Field(
        default=0,
        ge=0,
    )

    rejected_quantity: float = Field(
        default=0,
        ge=0,
    )

    remarks: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# ==========================================================
# Goods Receipt Line Response
# ==========================================================

class GoodsReceiptLineResponse(BaseModel):
    """
    Goods Receipt line response.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int

    goods_receipt_id: int

    purchase_order_line_id: Optional[int] = None

    description: str

    ordered_quantity: float
    received_quantity: float
    accepted_quantity: float
    rejected_quantity: float

    remarks: Optional[str] = None


# ==========================================================
# Goods Receipt Create
# ==========================================================

class GoodsReceiptCreate(BaseModel):
    """
    Request schema for creating a Goods Receipt / Service Entry.
    """

    purchase_order_id: int = Field(
        ...,
        gt=0,
    )

    receipt_type: str = Field(
        default="Goods",
        min_length=1,
        max_length=50,
    )

    received_date: Optional[datetime] = None

    remarks: Optional[str] = Field(
        default=None,
        max_length=1000,
    )

    line_items: List[GoodsReceiptLineCreate] = Field(
        ...,
        min_length=1,
    )


# ==========================================================
# Goods Receipt Status Update
# ==========================================================

class GoodsReceiptStatusUpdate(BaseModel):
    """
    Request schema for updating Goods Receipt status.
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


# ==========================================================
# Goods Receipt Decision Request
# ==========================================================

class GoodsReceiptDecisionRequest(BaseModel):
    """
    Request schema for accepting or rejecting a Goods Receipt.
    """

    remarks: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


# ==========================================================
# Goods Receipt Response
# ==========================================================

class GoodsReceiptResponse(BaseModel):
    """
    Goods Receipt response returned by the API.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int

    receipt_number: str

    purchase_order_id: int

    receipt_type: str

    status: str

    received_by_id: int

    received_date: datetime

    remarks: Optional[str] = None

    created_at: datetime

    updated_at: datetime

    line_items: List[GoodsReceiptLineResponse] = []