from typing import List, Optional

from pydantic import BaseModel


class MatchingResponse(BaseModel):

    success: bool

    invoice_id: int

    po_number: str

    is_match: bool

    match_score: float

    mismatches: List[str]

    status: str

    message: str

    match_run_id: int

    exception_id: Optional[int] = None
