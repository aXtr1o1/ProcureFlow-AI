from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.invoices import router as invoice_router
from app.api.approval import router as approval_router
from app.api import invoices
from app.core.config import settings
from app.api import purchase_orders
from app.api import matching

app = FastAPI(
    title="Invoice to PO Automation API",
    version="1.0.0"
)

app.include_router(auth_router)
app.include_router(invoice_router)
app.include_router(approval_router)
app.include_router(invoices.router)
app.include_router(purchase_orders.router)
app.include_router(matching.router)


@app.get("/")
def root():
    return {
        "message": "Backend Running Successfully"
    }
