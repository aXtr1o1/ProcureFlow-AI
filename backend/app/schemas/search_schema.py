from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict


# ==========================================================
# Search Response
# ==========================================================
class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[Dict[str, Any]]

    model_config = ConfigDict(
        from_attributes=True
    )