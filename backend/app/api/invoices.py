import os
import uuid
import io

from fastapi.responses import StreamingResponse

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.blob_storage_service import BlobStorageService
from app.services.document_intelligence_service import DocumentIntelligenceService
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database.database import get_db

from app.core.security import get_current_user
from app.database.models import User

from pydantic import BaseModel

from app.database.models import Invoice, InvoiceLineItem
from app.services.invoice_service import InvoiceService
from app.services.validation_service import ValidationService

document_service = DocumentIntelligenceService()

router = APIRouter(
    prefix="/invoices",
    tags=["Invoices"]
)

blob_service = BlobStorageService()

# ==========================================================
# Upload Invoice
# ==========================================================
@router.post("/")
async def upload_invoice(file: UploadFile = File(...)):
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
        current_user.id
    )

    data = []

    for invoice in invoices:
        data.append({
            "id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "vendor_name": invoice.vendor_name,
            "invoice_date": invoice.invoice_date,
            "currency": invoice.currency,
            "total_amount": invoice.total_amount,
            "processing_status": invoice.processing_status,
            "blob_name": invoice.blob_name,
            "blob_url": invoice.blob_url,
        })

    return {
        "success": True,
        "count": len(data),
        "data": data,
    }

# ==========================================================
# Get Invoice Details
# ==========================================================
@router.get("/details/{invoice_id}")
async def get_invoice_details(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice_service = InvoiceService(db)

    invoice = invoice_service.get_invoice_by_id(
        invoice_id,
        current_user.id
    )

    if not invoice:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found."
        )

    line_items = invoice_service.get_invoice_line_items(invoice_id)
    status_logs = invoice_service.get_invoice_status_logs(invoice_id)

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
            ]
        }
    }
    

# ==========================================================
# Download Invoice
# ==========================================================
@router.get("/{blob_name:path}")
async def download_invoice(blob_name: str):
    """
    Download invoice from Azure Blob Storage.
    """

    try:

        data = blob_service.download_invoice(blob_name)

        filename = os.path.basename(blob_name)

        return StreamingResponse(
            io.BytesIO(data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'inline; filename="{filename}"'
            }
        )

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

# ==========================================================
# Delete Invoice
# ==========================================================
@router.delete("/{blob_name:path}")
async def delete_invoice(blob_name: str):
    """
    Delete invoice from Azure Blob Storage.
    """

    try:

        blob_service.delete_invoice(blob_name)

        return {
            "success": True,
            "message": "Invoice deleted successfully."
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# Update Invoice Status (Placeholder)
# ==========================================================
@router.put("/{invoice_id}/status")
async def update_invoice_status(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    invoice_service = InvoiceService(db)

    invoice = invoice_service.get_invoice_by_id(
        invoice_id,
        current_user.id
    )

    if invoice is None:
        raise HTTPException(
            status_code=404,
            detail="Invoice not found."
        )

    invoice.processing_status = "Approval Pending"

    invoice_service.save_status_log(
        invoice=invoice,
        status="Approval Pending",
        remarks="Invoice processing completed."
    )

    db.commit()
    db.refresh(invoice)

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
    try:

        # Validate uploaded file
        if (
            file.content_type != "application/pdf"
            or not file.filename.lower().endswith(".pdf")
        ):
            raise HTTPException(
                status_code=400,
                detail="Only PDF invoice files are allowed."
            )
        # Generate one document ID
        document_id = str(uuid.uuid4())

        # Read uploaded PDF
        file_bytes = await file.read()

        # Analyze using Azure
        result = document_service.analyze_invoice(file_bytes)

        required_fields = [
            "invoice_number",
            "vendor_name",
            "invoice_date",
            "total_amount"
        ]

        for field in required_fields:
            if not result.get(field):
                raise HTTPException(
                    status_code=422,
                    detail=f"Invalid invoice. Missing {field}."
                )

        # Analyze the invoice
        result = document_service.analyze_invoice(file_bytes)

        # Store extracted fields in OCR Text folder
        ocr_blob = blob_service.upload_ocr_data(
            document_id=document_id,
            extracted_fields=result
        )

        validation_service = ValidationService()

        # Check whether the uploaded PDF is actually an invoice
        if not validation_service.is_invoice_document(result):
            raise HTTPException(
                status_code=422,
                detail="The uploaded PDF is not a valid invoice."
            )

        # Validate the extracted invoice data
        validation_result = validation_service.validate_invoice(
            result
        )

        if not validation_result["is_valid"]:
            raise HTTPException(
                status_code=422,
                detail=validation_result["errors"]
            )

        # Reset the file pointer before uploading
        await file.seek(0)

        upload_result = await blob_service.upload_invoice(
            document_id=document_id,
            file=file
        )

        ocr_blob = blob_service.upload_ocr_data(
            document_id=document_id,
            extracted_fields=result
        )

        # Continue with saving
        invoice_service = InvoiceService(db)

        existing_invoice = invoice_service.get_invoice_by_number(
            result["invoice_number"]
        )

        if existing_invoice:
            return {
                "success": False,
                "message": "Invoice already exists.",
                "invoice_number": result["invoice_number"]
            }


        invoice = invoice_service.save_invoice(
            user_id=current_user.id,
            invoice_data=result,
            blob_name=upload_result["blob_name"],
            blob_url=upload_result["blob_url"],
            ocr_blob=ocr_blob
        )

        invoice_service.save_line_items(
            invoice=invoice,
            line_items=result["line_items"]
        )

        invoice.processing_status = "OCR Completed"

        invoice_service.save_status_log(
            invoice=invoice,
            status="OCR Completed",
            remarks="OCR extraction completed successfully."
        )

        db.commit()
        db.refresh(invoice)

        # Add Blob Storage details to the response
        result["blob_name"] = upload_result["blob_name"]
        result["blob_url"] = upload_result["blob_url"]

        return {
            "success": True,
            "invoice_id": invoice.id,
            "processing_status": invoice.processing_status,
            "invoice": {
                **result
            }
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )