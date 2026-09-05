import os
import uuid
import io
import traceback
import logging
import asyncio
from typing import Optional

from fastapi.responses import StreamingResponse, JSONResponse

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.blob_storage_service import BlobStorageService
from app.services.document_intelligence_service import DocumentIntelligenceService
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database.database import get_db

from app.core.security import get_current_user
from app.database.models import User, Invoice
from app.services.invoice_service import InvoiceService
from app.services.validation_service import ValidationService
from app.services.currency_service import convert_invoice_amounts_to_usd

from app.services.matching_service import MatchingService

from app.schemas.invoice_schema import (
    InvoicePurchaseOrderLinkRequest,
)

logger = logging.getLogger(__name__)

document_service = DocumentIntelligenceService()

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"]
)

blob_service = BlobStorageService()


def _find_duplicate_invoice(
    db: Session,
    user_id: int,
    invoice_number: str,
    vendor_name: str,
    invoice_date: str,
    total_amount,
    exclude_invoice_id: Optional[int] = None,
):
    """Find an existing invoice that matches this one. Does not create records."""
    query_filters = []

    if exclude_invoice_id is not None:
        query_filters.append(Invoice.id != exclude_invoice_id)

    if invoice_number and not str(invoice_number).startswith("TEMP-"):
        match = (
            db.query(Invoice)
            .filter(
                Invoice.invoice_number == invoice_number,
                Invoice.user_id == user_id,
                *query_filters,
            )
            .first()
        )
        if match:
            return match

    # Soft match when OCR did not return a stable invoice number
    if vendor_name and invoice_date and total_amount is not None:
        return (
            db.query(Invoice)
            .filter(
                Invoice.user_id == user_id,
                Invoice.vendor_name == vendor_name,
                Invoice.invoice_date == str(invoice_date),
                Invoice.total_amount == float(total_amount),
                *query_filters,
            )
            .first()
        )

    return None


def _persist_validated_invoice(
    db: Session,
    user_id: int,
    document_id: str,
    upload_result: dict,
    ocr_result: dict,
) -> Invoice:
    """Save invoice + OCR artifacts + validation status after duplicate check passed."""
    invoice_service = InvoiceService(db)
    validation_service = ValidationService()

    if not validation_service.is_invoice_document(ocr_result):
        raise HTTPException(
            status_code=422,
            detail="The uploaded PDF is not a valid invoice.",
        )

    validation_result = validation_service.validate_invoice(ocr_result)
    if not validation_result["is_valid"]:
        raise HTTPException(
            status_code=422,
            detail=validation_result.get(
                "errors",
                ["Unknown validation error"],
            )[0],
        )

    ocr_blob = blob_service.upload_ocr_data(
        document_id=document_id,
        extracted_fields=ocr_result,
    )

    # Convert all monetary values to the canonical USD currency before saving.
    usd_data = convert_invoice_amounts_to_usd(
        {
            "invoice_number": ocr_result.get("invoice_number", ""),
            "vendor_name": ocr_result.get("vendor_name", ""),
            "vendor_address": ocr_result.get("vendor_address", ""),
            "customer_name": ocr_result.get("customer_name", ""),
            "invoice_date": ocr_result.get("invoice_date", ""),
            "due_date": ocr_result.get("due_date", ""),
            "purchase_order_number": ocr_result.get("purchase_order_number", ""),
            "currency": ocr_result.get("currency", "USD"),
            "subtotal": ocr_result.get("subtotal", 0),
            "tax": ocr_result.get("tax", 0),
            "total_amount": ocr_result.get("total_amount", 0),
            "line_items": ocr_result.get("line_items", []) or [],
        }
    )

    invoice = invoice_service.save_invoice(
        user_id=user_id,
        invoice_data={
            "invoice_number": usd_data.get("invoice_number", ""),
            "vendor_name": usd_data.get("vendor_name", ""),
            "vendor_address": usd_data.get("vendor_address", ""),
            "customer_name": usd_data.get("customer_name", ""),
            "invoice_date": usd_data.get("invoice_date", ""),
            "due_date": usd_data.get("due_date", ""),
            "purchase_order_number": usd_data.get("purchase_order_number", ""),
            "currency": "USD",
            "subtotal": usd_data.get("subtotal", 0),
            "tax": usd_data.get("tax", 0),
            "total_amount": usd_data.get("total_amount", 0),
            "line_items": [],
        },
        blob_name=upload_result["blob_name"],
        blob_url=upload_result["blob_url"],
        ocr_blob=ocr_blob,
    )

    invoice_service.save_status_log(
        invoice=invoice,
        status="Uploaded",
        remarks="Invoice file uploaded to storage.",
    )
    invoice.processing_status = "OCR Completed"
    invoice_service.save_status_log(
        invoice=invoice,
        status="OCR Completed",
        remarks="OCR extraction completed successfully.",
    )

    invoice.processing_status = "Validation Completed"
    invoice_service.save_status_log(
        invoice=invoice,
        status="Validation Completed",
        remarks="Invoice validation completed successfully.",
    )

    line_items = usd_data.get("line_items", []) or []
    if line_items:
        invoice_service.save_line_items(
            invoice=invoice,
            line_items=line_items,
        )

    db.commit()
    db.refresh(invoice)
    return invoice

# ==========================================================
# Upload Invoice
# ==========================================================
@router.post("/")
async def upload_invoice(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload an invoice PDF to Azure Blob Storage.
    """

    try:

        # Allow only PDF files
        if (
            file.content_type != "application/pdf"
            or not file.filename.lower().endswith(".pdf")
        ):
            raise HTTPException(
                status_code=400,
                detail="Only PDF invoice files are supported."
            )

        document_id = str(uuid.uuid4())

        result = await blob_service.upload_invoice(
            document_id=document_id,
            user_id=current_user.id,
            file=file
        )

        return {
            "success": True,
            "message": "Invoice uploaded successfully.",
            "data": result
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ==========================================================
# Get All Uploaded Files
# ==========================================================
@router.get("/")
async def get_all_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice_service = InvoiceService(db)

    invoices = invoice_service.get_all_invoices(
    user_id=current_user.id
)

    data = []

    for invoice in invoices:
        line_items = invoice_service.get_invoice_line_items(
            invoice_id=invoice.id,
            user_id=current_user.id,
        )

        data.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "vendor_name": (invoice.vendor_name or "").replace("\n", " ").strip(),
            "vendor_address": invoice.vendor_address,
            "customer_name": invoice.customer_name,
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,
            "purchase_order_number": invoice.purchase_order_number or None,
            "currency": invoice.currency,
            "subtotal": invoice.subtotal,
            "tax": invoice.tax,
            "total_amount": invoice.total_amount,
            "processing_status": invoice.processing_status,
            "blob_name": invoice.blob_name,
            "blob_url": invoice.blob_url,
            "line_items": [
                {
                    "id": item.id,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "amount": item.amount,
                }
                for item in line_items
            ],
        })

    return {
        "success": True,
        "count": len(data),
        "data": data,
    }

# ==========================================================
# Get Invoice Details
# ==========================================================
# ==========================================================
# Get Invoice Details
# ==========================================================
@router.get("/details/{invoice_id}")
async def get_invoice_details(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice_service = InvoiceService(db)

    # Scoped to the current user — each user only sees their own invoices.
    invoice = invoice_service.get_invoice_by_id(
        invoice_id=invoice_id,
        user_id=current_user.id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    line_items = invoice_service.get_invoice_line_items(
        invoice_id=invoice_id,
        user_id=current_user.id,
    )

    status_logs = invoice_service.get_invoice_status_logs(
        invoice_id=invoice_id,
        user_id=current_user.id,
    )

    return {
        "success": True,
        "data": {
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "vendor_name": invoice.vendor_name,
            "vendor_address": invoice.vendor_address,
            "customer_name": invoice.customer_name,
            "invoice_date": invoice.invoice_date,
            "due_date": invoice.due_date,
            "purchase_order_number": invoice.purchase_order_number,
            "currency": invoice.currency,
            "subtotal": invoice.subtotal,
            "tax": invoice.tax,
            "total_amount": invoice.total_amount,
            "processing_status": invoice.processing_status,
            "blob_name": invoice.blob_name,
            "blob_url": invoice.blob_url,
            "line_items": [
                {
                    "id": item.id,
                    "description": item.description,
                    "quantity": item.quantity,
                    "unit_price": item.unit_price,
                    "amount": item.amount,
                }
                for item in line_items
            ],
            "status_logs": [
                {
                    "id": log.id,
                    "status": log.status,
                    "remarks": log.remarks,
                    "updated_by": log.updated_by,
                    "created_at": log.created_at,
                }
                for log in status_logs
            ],
        },
    }

# ==========================================================
# Link Invoice to Procurement Purchase Order
# ==========================================================
@router.put("/{invoice_id}/purchase-order")
async def link_invoice_to_purchase_order(
    invoice_id: int,
    request: InvoicePurchaseOrderLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice_service = InvoiceService(db)

    invoice = invoice_service.get_invoice_by_id(
        invoice_id=invoice_id,
        user_id=current_user.id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    if invoice.processing_status in {
        "Approval Pending",
        "Approved",
        "Payment Pending",
        "Paid",
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "Approved or paid invoices cannot be matched again."
            ),
        )

    return invoice_service.link_invoice_to_purchase_order(
        invoice_id=invoice_id,
        purchase_order_id=request.purchase_order_id,
        user_id=current_user.id,
    )

# ==========================================================
# Send a successfully matched invoice for approval
# ==========================================================
@router.put("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    invoice_service = InvoiceService(db)

    invoice = invoice_service.send_for_approval(
        invoice_id=invoice_id,
        user_id=current_user.id,
    )

    return {
        "success": True,
        "status": invoice.processing_status
    }

@router.post("/analyze")
async def analyze_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    1) OCR the PDF in memory
    2) If duplicate → return message only (no blob upload, no DB save)
    3) Otherwise upload + save + validate
    """
    try:

        if (
            file.content_type != "application/pdf"
            or not file.filename.lower().endswith(".pdf")
        ):
            raise HTTPException(
                status_code=400,
                detail="Only PDF invoice files are allowed."
            )

        file_bytes = await file.read()

        # ========== OCR FIRST (no DB / blob yet) ==========
        ocr_result = await asyncio.to_thread(
            document_service.analyze_invoice,
            file_bytes,
        )

        # ========== DOCUMENT TYPE VALIDATION ==========
        validation_service = ValidationService()

        if not validation_service.is_invoice_document(ocr_result):
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid document. Only Invoice PDFs are accepted. "
                    "Purchase Orders must be created through the "
                    "Purchase Order workflow."
                ),
            )

        required_fields = ["vendor_name", "invoice_date", "total_amount"]
        missing_fields = [
            field for field in required_fields if not ocr_result.get(field)
        ]

        invoice_number = ocr_result.get("invoice_number")
        if not invoice_number:
            invoice_number = f"TEMP-{uuid.uuid4()}"
            ocr_result["invoice_number"] = invoice_number

        if missing_fields:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Invalid invoice. Missing fields: "
                    f"{', '.join(missing_fields)}"
                ),
            )

        # ========== DUPLICATE CHECK — exit without saving ==========
        duplicate_invoice = _find_duplicate_invoice(
            db=db,
            user_id=current_user.id,
            invoice_number=ocr_result.get("invoice_number", ""),
            vendor_name=ocr_result.get("vendor_name", ""),
            invoice_date=ocr_result.get("invoice_date", ""),
            total_amount=ocr_result.get("total_amount"),
        )

        if duplicate_invoice:
            message = (
                f"Duplicate invoice detected. Invoice number "
                f"'{ocr_result.get('invoice_number')}' already exists "
                f"(existing ID: {duplicate_invoice.id}). "
                f"Invoice was not uploaded."
            )
            print(f"[ANALYZE] {message}", flush=True)
            return JSONResponse(
                status_code=409,
                content={
                    "success": False,
                    "duplicate": True,
                    "processing_status": "Duplicate",
                    "invoice_id": None,
                    "invoice_number": ocr_result.get("invoice_number"),
                    "existing_invoice_id": duplicate_invoice.id,
                    "message": message,
                },
            )

        # ========== NOT DUPLICATE — upload + save ==========
        document_id = str(uuid.uuid4())
        await file.seek(0)

        upload_result = await blob_service.upload_invoice(
            document_id=document_id,
            file=file,
        )

        invoice = _persist_validated_invoice(
            db=db,
            user_id=current_user.id,
            document_id=document_id,
            upload_result=upload_result,
            ocr_result=ocr_result,
        )

        return {
            "success": True,
            "duplicate": False,
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "processing_status": invoice.processing_status,
            "message": "Invoice uploaded and validated successfully.",
        }

    except HTTPException:
        raise

    except Exception as e:
        logger.error(f"Invoice analysis error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Invoice analysis failed: {str(e)}"
        )

# ==========================================================
# Download Invoice
# ==========================================================
@router.get("/{blob_name:path}")
async def download_invoice(
    blob_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.blob_name == blob_name,
            Invoice.user_id == current_user.id,
        )
        .first()
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    try:
        data = blob_service.download_invoice(blob_name)

        filename = os.path.basename(blob_name)

        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f'inline; filename="{filename}"'
                )
            },
        )

    except HTTPException:
        raise

    except Exception:
        logger.exception("Invoice download failed")

        raise HTTPException(
            status_code=500,
            detail="Unable to download invoice.",
        )

# ==========================================================
# Delete Invoice
# ==========================================================
@router.delete("/{blob_name:path}")
async def delete_invoice(
    blob_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice = (
        db.query(Invoice)
        .filter(
            Invoice.blob_name == blob_name,
            Invoice.user_id == current_user.id,
        )
        .first()
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    try:
        blob_service.delete_invoice(blob_name)

        db.delete(invoice)
        db.commit()

        return {
            "success": True,
            "message": "Invoice deleted successfully.",
        }

    except HTTPException:
        raise

    except Exception:
        db.rollback()
        logger.exception("Invoice deletion failed")

        raise HTTPException(
            status_code=500,
            detail="Unable to delete invoice.",
        )

# ==========================================================
# Match Invoice with Procurement Purchase Order
# ==========================================================
@router.post("/{invoice_id}/match")
async def match_invoice_with_purchase_order(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    invoice_service = InvoiceService(db)

    invoice = invoice_service.get_invoice_by_id(
        invoice_id=invoice_id,
        user_id=current_user.id,
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found.",
        )

    if invoice.processing_status in {
        "Approval Pending",
        "Approved",
        "Payment Pending",
        "Paid",
    }:
        raise HTTPException(
            status_code=409,
            detail=(
                "Approved or paid invoices cannot be matched again."
            ),
        )

    if invoice.procurement_purchase_order_id is None:
        raise HTTPException(
            status_code=409,
            detail=(
                "Link the invoice to a Purchase Order "
                "before matching."
            ),
        )

    matching_service = MatchingService(db)

    result = matching_service.match_invoice_with_po(
        invoice_id=invoice_id,
        performed_by_id=current_user.id,
    )

    return result