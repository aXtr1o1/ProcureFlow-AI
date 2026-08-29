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

    invoices = relationship(
        "Invoice",
        back_populates="user"
    )

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

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="invoices"
    )

    invoice_number = Column(String(100), nullable=True)

    vendor_name = Column(String(255))
    vendor_address = Column(String(500))

    customer_name = Column(String(255))

    invoice_date = Column(String(100))
    due_date = Column(String(100))

    purchase_order_number = Column(String(100))
    procurement_purchase_order_id = Column(
        Integer,
        ForeignKey("procurement_purchase_orders.id"),
        nullable=True
    )

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

    procurement_purchase_order = relationship(
        "ProcurementPurchaseOrder",
        back_populates="invoices"
    )

    payments = relationship(
        "Payment",
        back_populates="invoice",
        cascade="all, delete-orphan"
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


# ==========================================================
# Procurement Workflow (new lifecycle)
# ==========================================================
# These tables deliberately live alongside the legacy invoice-first PORecord
# model.  Existing invoice/PO data remains readable while all newly-created
# procurement records use the Business Need -> PR -> PO workflow below.


class BusinessNeedType(Base):
    __tablename__ = "business_need_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    business_needs = relationship("BusinessNeed", back_populates="business_need_type")


class BusinessNeed(Base):
    __tablename__ = "business_needs"

    id = Column(Integer, primary_key=True, index=True)
    need_number = Column(String(100), unique=True, nullable=False, index=True)
    business_need_type_id = Column(Integer, ForeignKey("business_need_types.id"), nullable=False)
    requester_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String(2000), nullable=True)
    department = Column(String(255), nullable=True)
    business_unit = Column(String(255), nullable=True)
    project = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    cost_center = Column(String(100), nullable=True)
    required_by_date = Column(String(100), nullable=True)
    estimated_value = Column(Float, default=0)
    currency = Column(String(20), default="USD")
    status = Column(String(100), default="Draft", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_need_type = relationship(
        "BusinessNeedType", 
        back_populates="business_needs"
    )
    requester = relationship(
        "User",
        foreign_keys=[requester_id]
    )
    purchase_requisitions = relationship(
        "PurchaseRequisition", back_populates="business_need", cascade="all, delete-orphan"
    )


class PurchaseRequisition(Base):
    __tablename__ = "purchase_requisitions"

    id = Column(
        Integer, 
        primary_key=True, 
        index=True
    )
    pr_number = Column(
        String(100), 
        unique=True, 
        nullable=False, 
        index=True
    )
    business_need_id = Column(
        Integer, 
        ForeignKey("business_needs.id"), 
        nullable=False
    )
    requester_id = Column(
        Integer, 
        ForeignKey("users.id"), 
        nullable=False
    )
    title = Column(
        String(255), 
        nullable=False
    )
    justification = Column(
        String(2000), 
        nullable=True
    )
    department = Column(
        String(255), 
        nullable=True
    )
    business_unit = Column(
        String(255), 
        nullable=True
    )
    project = Column(
        String(255), 
        nullable=True
    )
    location = Column(
        String(255), 
        nullable=True
    )
    cost_center = Column(
        String(100), 
        nullable=True
    )
    currency = Column(
        String(20), 
        default="USD"
    )
    total_amount = Column(
        Float, 
        default=0
    )
    selected_vendor_name = Column(
        String(255), 
        nullable=True
    )
    negotiated_amount = Column(
        Float, 
        nullable=True
    )
    price_variance = Column(Float, nullable=True)
    price_variance_percentage = Column(Float, nullable=True)
    negotiation_remarks = Column(
        String(1000),
        nullable=True
    )
    negotiated_at = Column(
        DateTime,
        nullable=True
    )
    negotiated_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )
    status = Column(
        String(100), 
        default="Draft", 
        nullable=False
    )
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business_need = relationship(
        "BusinessNeed", 
        back_populates="purchase_requisitions"
    )
    requester = relationship(
        "User",
        foreign_keys=[requester_id]
    )

    negotiated_by = relationship(
        "User",
        foreign_keys=[negotiated_by_id]
    )
    line_items = relationship(
        "PurchaseRequisitionLine", 
        back_populates="purchase_requisition", 
        cascade="all, delete-orphan"
    )
    approvals = relationship(
        "PurchaseRequisitionApproval", 
        back_populates="purchase_requisition", 
        cascade="all, delete-orphan"
    )
    purchase_orders = relationship(
        "ProcurementPurchaseOrder", 
        back_populates="purchase_requisition"
    )


class PurchaseRequisitionLine(Base):
    __tablename__ = "purchase_requisition_lines"

    id = Column(Integer, primary_key=True, index=True)
    purchase_requisition_id = Column(
        Integer, 
        ForeignKey("purchase_requisitions.id"), 
        nullable=False
    )
    description = Column(
        String(500), 
        nullable=False
    )
    quantity = Column(
        Float, 
        nullable=False
    )
    unit_price = Column(
        Float, 
        nullable=False
    )
    amount = Column(
        Float, 
        nullable=False
    )

    purchase_requisition = relationship("PurchaseRequisition", back_populates="line_items")


class PurchaseRequisitionApproval(Base):
    __tablename__ = "purchase_requisition_approvals"

    id = Column(
        Integer, 
        primary_key=True, 
        index=True
    )
    purchase_requisition_id = Column(
        Integer, 
        ForeignKey("purchase_requisitions.id"), 
        nullable=False
    )
    reviewer_id = Column(
        Integer, 
        ForeignKey("users.id"), 
        nullable=False
    )
    decision = Column(
        String(50), 
        nullable=False
    )
    remarks = Column(
        String(1000), 
        nullable=True
    )
    decided_at = Column(
        DateTime, 
        default=datetime.utcnow
    )

    purchase_requisition = relationship(
        "PurchaseRequisition", 
        back_populates="approvals"
    )

    reviewer = relationship(
        "User",
        foreign_keys=[reviewer_id]
    )

class ProcurementPurchaseOrder(Base):
    __tablename__ = "procurement_purchase_orders"

    id = Column(Integer, primary_key=True, index=True)
    po_number = Column(String(100), unique=True, nullable=False, index=True)
    purchase_requisition_id = Column(Integer, ForeignKey("purchase_requisitions.id"), nullable=False)
    vendor_name = Column(String(255), nullable=False)
    currency = Column(String(20), default="USD")
    subtotal = Column(Float, default=0)
    tax = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    status = Column(String(100), default="Draft", nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    purchase_requisition = relationship(
        "PurchaseRequisition",
        back_populates="purchase_orders"
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id]
    )

    line_items = relationship(
        "ProcurementPurchaseOrderLine",
        back_populates="purchase_order",
        cascade="all, delete-orphan"
    )

    invoices = relationship(
        "Invoice",
        back_populates="procurement_purchase_order"
    )
    approvals = relationship(
        "PurchaseOrderApproval", back_populates="purchase_order", cascade="all, delete-orphan"
    )
    vendor_responses = relationship(
        "PurchaseOrderVendorResponse", 
        back_populates="purchase_order", 
        cascade="all, delete-orphan"
    )

    goods_receipts = relationship(
        "GoodsReceipt",
        back_populates="purchase_order",
        cascade="all, delete-orphan"
    )


class ProcurementPurchaseOrderLine(Base):
    __tablename__ = "procurement_purchase_order_lines"

    id = Column(Integer, primary_key=True, index=True)

    purchase_order_id = Column(
        Integer,
        ForeignKey("procurement_purchase_orders.id"),
        nullable=False
    )

    description = Column(
        String(500),
        nullable=False
    )

    quantity = Column(
        Float,
        nullable=False
    )

    unit_price = Column(
        Float,
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    purchase_order = relationship(
        "ProcurementPurchaseOrder",
        back_populates="line_items"
    )

    goods_receipt_lines = relationship(
        "GoodsReceiptLine",
        back_populates="purchase_order_line"
    )

# ==========================================================
# Goods Receipt / Service Entry
# ==========================================================

class GoodsReceipt(Base):
    __tablename__ = "goods_receipts"

    id = Column(Integer, primary_key=True, index=True)

    receipt_number = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    purchase_order_id = Column(
        Integer,
        ForeignKey("procurement_purchase_orders.id"),
        nullable=False
    )

    receipt_type = Column(
        String(50),
        nullable=False,
        default="Goods"
    )
    # Goods / Service

    status = Column(
        String(100),
        nullable=False,
        default="Draft"
    )
    # Draft / Submitted / Accepted / Rejected

    received_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    received_date = Column(
        DateTime,
        default=datetime.utcnow
    )

    remarks = Column(
        String(1000),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    purchase_order = relationship(
        "ProcurementPurchaseOrder",
        back_populates="goods_receipts"
    )

    received_by = relationship(
        "User",
        foreign_keys=[received_by_id]
    )

    line_items = relationship(
        "GoodsReceiptLine",
        back_populates="goods_receipt",
        cascade="all, delete-orphan"
    )


class GoodsReceiptLine(Base):
    __tablename__ = "goods_receipt_lines"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    goods_receipt_id = Column(
        Integer,
        ForeignKey("goods_receipts.id"),
        nullable=False
    )

    purchase_order_line_id = Column(
        Integer,
        ForeignKey("procurement_purchase_order_lines.id"),
        nullable=True
    )

    description = Column(
        String(500),
        nullable=False
    )

    ordered_quantity = Column(
        Float,
        default=0,
        nullable=False
    )

    received_quantity = Column(
        Float,
        default=0,
        nullable=False
    )

    accepted_quantity = Column(
        Float,
        default=0,
        nullable=False
    )

    rejected_quantity = Column(
        Float,
        default=0,
        nullable=False
    )

    remarks = Column(
        String(1000),
        nullable=True
    )

    goods_receipt = relationship(
        "GoodsReceipt",
        back_populates="line_items"
    )

    purchase_order_line = relationship(
        "ProcurementPurchaseOrderLine"
    )

# ==========================================================
# Payment Workflow
# ==========================================================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    payment_reference = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    payment_method = Column(
        String(100),
        nullable=True
    )
    # Bank Transfer / ACH / Cheque / Card / Other

    amount = Column(
        Float,
        nullable=False,
        default=0
    )

    currency = Column(
        String(20),
        nullable=False,
        default="USD"
    )

    status = Column(
        String(100),
        nullable=False,
        default="Pending"
    )
    # Pending / Paid / Failed / Cancelled

    payment_date = Column(
        DateTime,
        nullable=True
    )

    due_date = Column(
        DateTime,
        nullable=True
    )

    remarks = Column(
        String(1000),
        nullable=True
    )

    created_by_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    invoice = relationship(
        "Invoice",
        back_populates="payments"
    )

    created_by = relationship(
        "User",
        foreign_keys=[created_by_id]
    )


class PurchaseOrderApproval(Base):
    __tablename__ = "purchase_order_approvals"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("procurement_purchase_orders.id"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    decision = Column(String(50), nullable=False)
    remarks = Column(String(1000), nullable=True)
    decided_at = Column(DateTime, default=datetime.utcnow)

    purchase_order = relationship("ProcurementPurchaseOrder", back_populates="approvals")


class PurchaseOrderVendorResponse(Base):
    __tablename__ = "purchase_order_vendor_responses"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(Integer, ForeignKey("procurement_purchase_orders.id"), nullable=False)
    response = Column(String(50), nullable=False)
    remarks = Column(String(1000), nullable=True)
    responded_at = Column(DateTime, default=datetime.utcnow)

    purchase_order = relationship("ProcurementPurchaseOrder", back_populates="vendor_responses")


# ==========================================================
# Invoice Match and Exception Workflow
# ==========================================================
class InvoiceMatchRun(Base):
    __tablename__ = "invoice_match_runs"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("procurement_purchase_orders.id"), nullable=False)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(100), nullable=False)
    match_score = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    mismatches = relationship(
        "InvoiceMatchMismatch", back_populates="match_run", cascade="all, delete-orphan"
    )


class InvoiceMatchMismatch(Base):
    __tablename__ = "invoice_match_mismatches"

    id = Column(Integer, primary_key=True, index=True)
    match_run_id = Column(Integer, ForeignKey("invoice_match_runs.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    po_value = Column(String(500), nullable=True)
    invoice_value = Column(String(500), nullable=True)

    match_run = relationship("InvoiceMatchRun", back_populates="mismatches")


class InvoiceException(Base):
    __tablename__ = "invoice_exceptions"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=False)
    purchase_order_id = Column(Integer, ForeignKey("procurement_purchase_orders.id"), nullable=False)
    match_run_id = Column(Integer, ForeignKey("invoice_match_runs.id"), nullable=False)
    status = Column(String(100), default="Open", nullable=False)
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_remarks = Column(String(1000), nullable=True)
    resolved_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
