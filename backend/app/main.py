from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.database import Base, engine
from app.database import models

Base.metadata.create_all(bind=engine)

from app.api.auth import router as auth_router
from app.api.invoices import router as invoice_router
from app.api.approval import router as approval_router
from app.api import purchase_orders
from app.api import matching
from app.api import azure_openai
from app.api import summary

app = FastAPI(
    title="Invoice to PO Automation API",
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
app.include_router(azure_openai.router)
app.include_router(summary.router)

@app.get("/")
def root():
    return {"message": "Backend Running Successfully"}