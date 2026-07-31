from pydantic import BaseModel, ConfigDict


class SummaryResponse(BaseModel):
    invoice_id: int
    invoice_number: str
    vendor_name: str
    customer_name: str
    currency: str
    subtotal: float
    tax: float
    total_amount: float
    summary: str
    blob_name: str
    blob_url: str

    model_config = ConfigDict(from_attributes=True)