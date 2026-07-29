from typing import Dict, List


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
        print("Validation Service Executed")

        # --------------------------------------------------
        # Invoice Number
        # --------------------------------------------------
        if not invoice_data.get("invoice_number"):
            errors.append("Invoice number is missing.")

        # --------------------------------------------------
        # Vendor Name
        # --------------------------------------------------
        if not invoice_data.get("vendor_name"):
            errors.append("Vendor name is missing.")

        # --------------------------------------------------
        # Customer Name
        # --------------------------------------------------
        if not invoice_data.get("customer_name"):
            errors.append("Customer name is missing.")

        # --------------------------------------------------
        # Invoice Date
        # --------------------------------------------------
        if not invoice_data.get("invoice_date"):
            errors.append("Invoice date is missing.")

        # --------------------------------------------------
        # Total Amount
        # --------------------------------------------------
        total_amount = invoice_data.get("total_amount")

        if total_amount is None:
            errors.append("Total amount is missing.")
        elif total_amount <= 0:
            errors.append("Total amount must be greater than zero.")

        # --------------------------------------------------
        # Currency
        # --------------------------------------------------
        if not invoice_data.get("currency"):
            errors.append("Currency is missing.")

        # --------------------------------------------------
        # Line Items
        # --------------------------------------------------
        line_items = invoice_data.get("line_items", [])

        if len(line_items) == 0:
            errors.append("Invoice contains no line items.")

        # --------------------------------------------------
        # Result
        # --------------------------------------------------
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }

    def is_invoice_document(self, invoice_data: Dict) -> bool:
        """
        Check whether the extracted document contains the minimum
        required fields to be considered an invoice.
        """

        required_fields = [
            "invoice_number",
            "vendor_name",
            "invoice_date",
            "total_amount"
        ]

        return all(invoice_data.get(field) for field in required_fields)