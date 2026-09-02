import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class ValidationService:
    """
    Service responsible for validating extracted invoice data
    before further processing.
    """

    def validate_invoice(self, invoice_data: Dict) -> Dict:
        """
        Validate invoice header fields.

        Returns:
        {
            "is_valid": bool,
            "errors": []
        }
        """

        errors: List[str] = []

        # --------------------------------------------------
        # Invoice Number (Optional - may be generated if missing)
        # --------------------------------------------------
        if not invoice_data.get("invoice_number"):
            logger.warning("Invoice number is missing (will use generated temporary ID)")
        else:
            logger.info(f"✓ Invoice number: {invoice_data.get('invoice_number')}")

        # --------------------------------------------------
        # Vendor Name
        # --------------------------------------------------
        if not invoice_data.get("vendor_name"):
            errors.append("Vendor name is missing.")
        else:
            logger.info(f"✓ Vendor name: {invoice_data.get('vendor_name')}")

        # --------------------------------------------------
        # Customer Name (Optional)
        # --------------------------------------------------
        if not invoice_data.get("customer_name"):
            logger.warning("Customer name is missing (optional)")
        else:
            logger.info(f"✓ Customer name: {invoice_data.get('customer_name')}")

        # --------------------------------------------------
        # Invoice Date
        # --------------------------------------------------
        if not invoice_data.get("invoice_date"):
            errors.append("Invoice date is missing.")
        else:
            logger.info(f"✓ Invoice date: {invoice_data.get('invoice_date')}")

        # --------------------------------------------------
        # Total Amount
        # --------------------------------------------------
        total_amount = invoice_data.get("total_amount")

        if total_amount is None:
            errors.append("Total amount is missing.")
        elif total_amount <= 0:
            errors.append("Total amount must be greater than zero.")
        else:
            logger.info(f"✓ Total amount: {total_amount}")

        # --------------------------------------------------
        # Currency
        # --------------------------------------------------
        if not invoice_data.get("currency"):
            errors.append("Currency is missing.")
        else:
            logger.info(f"✓ Currency: {invoice_data.get('currency')}")

        # --------------------------------------------------
        # Result
        # --------------------------------------------------
        if errors:
            logger.error(f"Validation errors: {errors}")
        else:
            logger.info("All validations passed!")
            
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }

    def is_invoice_document(self, invoice_data: Dict) -> bool:
        """
        Check whether the uploaded document is an invoice.

        Purchase Orders and other procurement documents must
        not be accepted through the invoice upload workflow.
        """

        # --------------------------------------------------
        # 1. Check Azure detected document type
        # --------------------------------------------------

        document_type = str(
            invoice_data.get("document_type", "")
        ).strip().lower()

        if document_type:
            logger.info(
                f"Document type detected by Azure: {document_type}"
            )

            if document_type in {
                "purchase order",
                "purchase_order",
                "purchaseorder",
                "po",
            }:
                logger.warning(
                    "Purchase Order detected. Invoice upload rejected."
                )
                return False

            if document_type not in {
                "invoice",
                "invoices",
            }:
                logger.warning(
                    f"Unsupported document type: {document_type}"
                )
                return False

        # --------------------------------------------------
        # 2. Check extracted document text
        # --------------------------------------------------

        document_content = str(
            invoice_data.get("document_content", "")
        ).strip().upper()

        if document_content:

            purchase_order_indicators = [
                "PURCHASE ORDER",
                "PURCHASE ORDER NUMBER",
                "PO NUMBER",
                "PO NO.",
                "PO NO:",
            ]

            for indicator in purchase_order_indicators:
                if indicator in document_content:
                    logger.warning(
                        f"Purchase Order indicator detected: {indicator}"
                    )

                    return False

        # --------------------------------------------------
        # 3. Check minimum invoice fields
        # --------------------------------------------------

        required_fields = [
            "vendor_name",
            "invoice_date",
            "total_amount",
        ]

        missing_fields = [
            field
            for field in required_fields
            if not invoice_data.get(field)
        ]

        if missing_fields:
            logger.warning(
                f"Required invoice fields missing: {missing_fields}"
            )
            return False

        # --------------------------------------------------
        # 4. Document passed invoice validation
        # --------------------------------------------------

        logger.info("Document identified as a valid invoice.")
        return True