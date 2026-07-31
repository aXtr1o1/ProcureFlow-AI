from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Float,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from app.database.database import Base


# ==========================================================
# Users Table
# ==========================================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    audit_logs = relationship("AuditLog", back_populates="user")


# ==========================================================
# Audit Logs
# ==========================================================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    action = Column(String(100), nullable=False)
    module = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)

    message = Column(String(500))

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")


# ==========================================================
# Invoice Table
# ==========================================================
class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    invoice_number = Column(String(100), unique=True, nullable=True)

    vendor_name = Column(String(255))
    vendor_address = Column(String(500))

    customer_name = Column(String(255))

    invoice_date = Column(String(100))
    due_date = Column(String(100))

    purchase_order_number = Column(String(100))

    currency = Column(String(20))

    subtotal = Column(Float, default=0)

    tax = Column(Float, default=0)

    total_amount = Column(Float, default=0)

    blob_name = Column(String(255))
    blob_url = Column(String(1000))

    # Invoice OCR JSON
    ocr_json_blob_name = Column(String(255), nullable=True)
    ocr_json_blob_url = Column(String(1000), nullable=True)

    processing_status = Column(String(100), default="Uploaded")

    created_at = Column(DateTime, default=datetime.utcnow)

    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    line_items = relationship(
        "InvoiceLineItem",
        back_populates="invoice",
        cascade="all, delete"
    )

    status_logs = relationship(
        "InvoiceStatusLog",
        back_populates="invoice",
        cascade="all, delete"
    )

    approvals = relationship(
        "ApprovalHistory",
        back_populates="invoice",
        cascade="all, delete"
    )

    po_record = relationship(
        "PORecord",
        back_populates="invoice",
        uselist=False
    )


# ==========================================================
# Invoice Line Items
# ==========================================================
class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    description = Column(String(500))

    quantity = Column(Float)

    unit_price = Column(Float)

    amount = Column(Float)

    invoice = relationship(
        "Invoice",
        back_populates="line_items"
    )


# ==========================================================
# Invoice Status Logs
# ==========================================================
class InvoiceStatusLog(Base):
    __tablename__ = "invoice_status_logs"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    status = Column(String(100), nullable=False)

    remarks = Column(String(500))

    updated_by = Column(String(100))

    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship(
        "Invoice",
        back_populates="status_logs"
    )


# ==========================================================
# Approval History
# ==========================================================
class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    reviewer = Column(String(255))

    decision = Column(String(50))

    remarks = Column(String(500))

    approved_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship(
        "Invoice",
        back_populates="approvals"
    )


# ==========================================================
# Purchase Order Records
# ==========================================================
class PORecord(Base):
    __tablename__ = "po_records"

    id = Column(Integer, primary_key=True, index=True)

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    po_number = Column(String(100), unique=True, nullable=False)

    invoice_number = Column(String(100))

    vendor_name = Column(String(255))

    customer_name = Column(String(255))

    currency = Column(String(20))

    po_date = Column(String(100))

    subtotal = Column(Float, default=0)

    tax = Column(Float, default=0)

    total_amount = Column(Float, default=0)

    blob_name = Column(String(255))

    blob_url = Column(String(1000))

    status = Column(String(100), default="Generated")

    generated_by = Column(String(100), default="System")

    generated_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship(
        "Invoice",
        back_populates="po_record"
    )