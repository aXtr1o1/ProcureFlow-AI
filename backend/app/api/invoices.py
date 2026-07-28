from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.blob_storage_service import BlobStorageService
from app.services.document_intelligence_service import DocumentIntelligenceService
from sqlalchemy.orm import Session
from fastapi import Depends
from app.database.database import get_db

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
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are allowed."
            )

        result = await blob_service.upload_invoice(file)

        return {
            "success": True,
            "message": "Invoice uploaded successfully.",
            "data": result
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# Get All Uploaded Files
# ==========================================================
@router.get("/")
async def get_all_invoices():
    """
    List all uploaded invoice files from Azure Blob Storage.
    """

    try:

        invoices = blob_service.list_invoices()

        return {
            "success": True,
            "count": len(invoices),
            "data": invoices
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# Download Invoice
# ==========================================================
@router.get("/{blob_name}")
async def download_invoice(blob_name: str):
    """
    Download invoice from Azure Blob Storage.
    """

    try:

        data = blob_service.download_invoice(blob_name)

        return {
            "success": True,
            "message": "Invoice downloaded successfully.",
            "size_in_bytes": len(data)
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================================
# Delete Invoice
# ==========================================================
@router.delete("/{blob_name}")
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
async def update_invoice_status(invoice_id: str):
    """
    Update invoice processing status.
    """

    return {
        "message": f"Update invoice status for '{invoice_id}' endpoint is ready."
    }

@router.post("/analyze")
async def analyze_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        file_bytes = await file.read()

        # Analyze the invoice
        result = document_service.analyze_invoice(file_bytes)

        # Validate the extracted data
        validation_service = ValidationService()

        validation_result = validation_service.validate_invoice(
            result[0]
        )

        # Print validation result (temporary)
        print(validation_result)

        # Continue with saving
        invoice_service = InvoiceService(db)

        existing_invoice = invoice_service.get_invoice_by_number(
            result[0]["invoice_number"]
        )

        if existing_invoice:
            return {
                "success": False,
                "message": "Invoice already exists.",
                "invoice_number": result[0]["invoice_number"]
            }


        invoice = invoice_service.save_invoice(
            invoice_data=result[0],
            blob_name=None,
            blob_url=None
        )

        invoice_service.save_line_items(
            invoice=invoice,
            line_items=result[0]["line_items"]
        )

        invoice_service.save_status_log(
            invoice=invoice,
            status="Uploaded",
            remarks="Invoice uploaded successfully."
        )

        return {
            "success": True,
            "invoice": result[0]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))