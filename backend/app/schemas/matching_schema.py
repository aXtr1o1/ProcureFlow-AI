from typing import List

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