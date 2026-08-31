from typing import List, Optional
from pydantic import BaseModel


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

    mismatches: List[MatchingMismatch]

    status: str

    message: str

    match_run_id: int

    exception_id: Optional[int] = None