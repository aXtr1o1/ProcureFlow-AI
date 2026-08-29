from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BusinessNeedTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    is_active: bool
    sort_order: int


class BusinessNeedCreate(BaseModel):
    business_need_type_id: int

    title: str = Field(
        min_length=1,
        max_length=255
    )

    description: Optional[str] = Field(
        default=None,
        max_length=2000
    )

    department: Optional[str] = None
    business_unit: Optional[str] = None
    project: Optional[str] = None
    location: Optional[str] = None
    cost_center: Optional[str] = None
    required_by_date: Optional[str] = None

    estimated_value: float = Field(
        default=0,
        ge=0
    )

    currency: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=20,
    )


class BusinessNeedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    need_number: str
    business_need_type: BusinessNeedTypeResponse
    title: str
    description: Optional[str]
    department: Optional[str]
    business_unit: Optional[str]
    project: Optional[str]
    location: Optional[str]
    cost_center: Optional[str]
    required_by_date: Optional[str]
    estimated_value: float
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime
