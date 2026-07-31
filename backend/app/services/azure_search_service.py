from typing import List

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from sqlalchemy.orm import Session

from app.core.config import settings


class AzureSearchService:
    """
    Service responsible for querying Azure AI Search.
    """

    def __init__(self, db: Session):
        self.db = db

        self.client = SearchClient(
            endpoint=settings.AZURE_SEARCH_ENDPOINT,
            index_name=settings.AZURE_SEARCH_INDEX_NAME,
            credential=AzureKeyCredential(
                settings.AZURE_SEARCH_API_KEY
            )
        )

    # ======================================================
    # General Search
    # ======================================================
    def search(
        self,
        query: str
    ) -> List[dict]:

        results = self.client.search(
            search_text=query,
            top=10,
            include_total_count=True
        )

        return [
            dict(result)
            for result in results
        ]

    # ======================================================
    # Search by Invoice Number
    # ======================================================
    def search_by_invoice_number(
        self,
        invoice_number: str
    ) -> List[dict]:

        results = self.client.search(
            search_text=invoice_number,
            filter=f"invoiceNumber eq '{invoice_number}'",
            top=5
        )

        return [
            dict(result)
            for result in results
        ]

    # ======================================================
    # Search by Vendor
    # ======================================================
    def search_by_vendor(
        self,
        vendor_name: str
    ) -> List[dict]:

        results = self.client.search(
            search_text=vendor_name,
            filter=f"vendorName eq '{vendor_name}'"
        )

        return [
            dict(result)
            for result in results
        ]

    # ======================================================
    # Search by Customer
    # ======================================================
    def search_by_customer(
        self,
        customer_name: str
    ) -> List[dict]:

        results = self.client.search(
            search_text=customer_name,
            filter=f"customer_name eq '{customer_name}'"
        )

        return [
            dict(result)
            for result in results
        ]

    # ======================================================
    # Search by Purchase Order Number
    # ======================================================
    def search_by_po_number(
        self,
        po_number: str
    ) -> List[dict]:

        results = self.client.search(
            search_text=po_number,
            filter=f"po_number eq '{po_number}'"
        )

        return [
            dict(result)
            for result in results
        ]