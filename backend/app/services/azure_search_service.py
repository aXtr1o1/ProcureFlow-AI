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
            top=10
        )

        return [
            dict(result)
            for result in results
        ]