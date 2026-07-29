from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential

from app.core.config import settings

class DocumentIntelligenceService:

    def __init__(self):

        self.client = DocumentIntelligenceClient(
            endpoint=settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT,
            credential=AzureKeyCredential(
                settings.AZURE_DOCUMENT_INTELLIGENCE_KEY
            )
        )

    # =====================================================
    # Analyze Invoice from Uploaded File
    # =====================================================

    def analyze_invoice(self, invoice_bytes: bytes):

        try:

            poller = self.client.begin_analyze_document(
                model_id="prebuilt-invoice",
                body=invoice_bytes
            )

            result = poller.result()

            return self._parse_invoice(result)

        except Exception as e:
            raise Exception(f"Document Intelligence Error: {str(e)}")

    # =====================================================
    # Analyze Invoice from Blob URL
    # =====================================================

    def analyze_invoice_from_url(self, blob_url: str):

        try:

            poller = self.client.begin_analyze_document(
                model_id="prebuilt-invoice",
                analyze_request={
                    "urlSource": blob_url
                }
            )

            result = poller.result()

            return self._parse_invoice(result)

        except Exception as e:
            raise Exception(f"Document Intelligence Error: {str(e)}")

    # =====================================================
    # Parse Azure Response
    # =====================================================

    def _parse_invoice(self, result):

        invoices = []

        for document in result.documents:

            invoice = {
                "invoice_number": None,
                "vendor_name": None,
                "vendor_address": None,
                "customer_name": None,
                "invoice_date": None,
                "due_date": None,
                "purchase_order_number": None,
                "currency": None,
                "subtotal": None,
                "tax": None,
                "total_amount": None,
                "payment_term": None,
                "service_start_date": None,
                "vendor_phone": None,
                "blob_name": None,
                "blob_url": None,
                "line_items": []
            }

            fields = document.fields

            # ----------------------------
            # Header Information
            # ----------------------------

            if "InvoiceId" in fields:
                invoice["invoice_number"] = fields["InvoiceId"].value_string

            if "VendorName" in fields:
                invoice["vendor_name"] = fields["VendorName"].value_string

            if "VendorAddress" in fields:
                invoice["vendor_address"] = fields["VendorAddress"].content

            if "CustomerName" in fields:
                invoice["customer_name"] = fields["CustomerName"].value_string

            if "InvoiceDate" in fields:
                invoice["invoice_date"] = str(fields["InvoiceDate"].value_date)

            if "DueDate" in fields:
                invoice["due_date"] = str(fields["DueDate"].value_date)

            if "PurchaseOrder" in fields:
                invoice["purchase_order_number"] = fields["PurchaseOrder"].value_string

            if "PaymentTerm" in fields:
                invoice["payment_term"] = fields["PaymentTerm"].value_string

            if "ServiceStartDate" in fields:
                invoice["service_start_date"] = str(
                    fields["ServiceStartDate"].value_date
                )

            if "VendorPhoneNumber" in fields:
                invoice["vendor_phone"] = fields["VendorPhoneNumber"].value_phone_number

            # ----------------------------
            # Currency Fields
            # ----------------------------

            if "SubTotal" in fields and fields["SubTotal"].value_currency:
                invoice["subtotal"] = fields["SubTotal"].value_currency.amount
                invoice["currency"] = fields["SubTotal"].value_currency.currency_code

            if "TotalTax" in fields and fields["TotalTax"].value_currency:
                invoice["tax"] = fields["TotalTax"].value_currency.amount

            if "InvoiceTotal" in fields and fields["InvoiceTotal"].value_currency:
                invoice["total_amount"] = (
                    fields["InvoiceTotal"].value_currency.amount
                )

                if invoice["currency"] is None:
                    invoice["currency"] = (
                        fields["InvoiceTotal"]
                        .value_currency
                        .currency_code
                    )

            # ----------------------------
            # Line Items
            # ----------------------------

            if "Items" in fields:

                items = fields["Items"].value_array

                for item in items:

                    obj = item.value_object

                    line = {
                        "description": None,
                        "quantity": None,
                        "unit_price": None,
                        "amount": None
                    }

                    if "Description" in obj:
                        line["description"] = obj["Description"].value_string

                    if "Quantity" in obj:
                        line["quantity"] = obj["Quantity"].value_number

                    if (
                        "UnitPrice" in obj and
                        obj["UnitPrice"].value_currency
                    ):
                        line["unit_price"] = (
                            obj["UnitPrice"].value_currency.amount
                        )

                    if (
                        "Amount" in obj and
                        obj["Amount"].value_currency
                    ):
                        line["amount"] = (
                            obj["Amount"].value_currency.amount
                        )

                    invoice["line_items"].append(line)

            invoices.append(invoice)

        if invoices:
            return invoices[0]

        return {}