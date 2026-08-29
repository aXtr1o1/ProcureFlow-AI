from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import Base, engine
from app.database import models
from app.database.migrations import run_schema_migrations

Base.metadata.create_all(bind=engine)
run_schema_migrations(engine)

from app.api.auth import router as auth_router
from app.api.invoices import router as invoice_router
from app.api.approval import router as approval_router
from app.api import purchase_orders
from app.api import matching
from app.api import gemini
from app.api import search
from app.api import summary
from app.api import business_needs
from app.api import purchase_requisitions
from app.api import exceptions
from app.api import goods_receipts
from app.api import payments
from app.api import dashboard

app = FastAPI(
    title="CloudGate Invoice to PO Automation API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(invoice_router)
app.include_router(approval_router)
app.include_router(purchase_orders.router)
app.include_router(matching.router)
app.include_router(gemini.router)
app.include_router(search.router)
app.include_router(summary.router)
app.include_router(business_needs.router)
app.include_router(purchase_requisitions.router)
app.include_router(exceptions.router)
app.include_router(goods_receipts.router)
app.include_router(payments.router)
app.include_router(dashboard.router)

@app.get("/")
def root():
    return {
        "message": "Backend Running Successfully"
    }
