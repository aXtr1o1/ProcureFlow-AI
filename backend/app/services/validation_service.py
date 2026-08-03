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
        Check whether the extracted document contains the minimum
        required fields to be considered an invoice.
        """

        # Invoice number is optional (can be generated)
        required_fields = [
            "vendor_name",
            "invoice_date",
            "total_amount"
        ]

        return all(invoice_data.get(field) for field in required_fields)