from typing import Any, List, Optional

from pydantic import BaseModel, Field


class MatchingMismatch(BaseModel):
    field_name: str
    po_value: Optional[str] = None
    invoice_value: Optional[str] = None


class MatchingResponse(BaseModel):
    success: bool

    invoice_id: int

    po_number: str

    is_match: bool

    match_score: float

    matched_details: List[dict[str, Any]] = Field(
        default_factory=list
    )

    amount_excluding_tax: Optional[dict[str, Any]] = None

    amount_including_tax: Optional[dict[str, Any]] = None

    tax: Optional[dict[str, Any]] = None

    mismatches: List[MatchingMismatch] = Field(
        default_factory=list
    )

    status: str

    message: str

    match_run_id: int

    exception_id: Optional[int] = None