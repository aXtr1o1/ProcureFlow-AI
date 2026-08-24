from typing import Any, Dict, List, Optional
import json
import re
from urllib.parse import unquote, urlparse

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from sqlalchemy.orm import Session

from app.core.config import settings

class AzureSearchService:

    def __init__(self, db: Optional[Session] = None):
        self.db = db

        self.client = SearchClient(
            endpoint=settings.AZURE_SEARCH_ENDPOINT.strip(),
            index_name=settings.AZURE_SEARCH_INDEX_NAME.strip(),
            credential=AzureKeyCredential(
                settings.AZURE_SEARCH_API_KEY.strip()
            ),
        )

    @staticmethod
    def _pick(doc: dict, *keys: str, default=None):
        for key in keys:
            value = doc.get(key)
            if value is not None and value != "":
                return value
        return default

    @staticmethod
    def _clean_text(value: Any) -> Optional[str]:
        if value is None:
            return None
        text = str(value).replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n+", " ", text).strip()
        return text or None

    @staticmethod
    def _blob_name_from_url(blob_url: Optional[str]) -> Optional[str]:
        if not blob_url:
            return None
        try:
            path = unquote(urlparse(blob_url).path)
            # /container/Invoices/uuid.pdf -> Invoices/uuid.pdf
            parts = [p for p in path.split("/") if p]
            if len(parts) >= 2:
                return "/".join(parts[1:])
            return parts[-1] if parts else None
        except Exception:
            return None

    @staticmethod
    def _parse_amount(value: Any) -> Optional[float]:
        if value is None or value == "":
            return None
        if isinstance(value, (int, float)):
            return float(value)
        match = re.search(r"-?\d+(?:[.,]\d+)?", str(value).replace(",", ""))
        if not match:
            return None
        try:
            return float(match.group(0))
        except Exception:
            return None

    @staticmethod
    def _parse_line_items(chunk: str) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        if not chunk:
            return items

        items_section = chunk
        marker = re.search(r"Items:\s*", chunk, re.IGNORECASE)
        if marker:
            items_section = chunk[marker.end() :]

        # Collapse soft line wraps so "Bay -\nUnit 1104 Qty:" becomes one line
        normalized = re.sub(r"\s*\n\s*", " ", items_section)
        pattern = re.compile(
            r"(?P<desc>.+?)\s+Qty:(?P<qty>-?\d+(?:\.\d+)?)\s+Price:(?P<price>-?\d+(?:\.\d+)?)",
            re.IGNORECASE,
        )
        for match in pattern.finditer(normalized):
            description = re.sub(r"\s+", " ", match.group("desc")).strip(" -")
            quantity = float(match.group("qty"))
            unit_price = float(match.group("price"))
            items.append(
                {
                    "description": description,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "amount": round(quantity * unit_price, 2),
                }
            )
        return items

    @staticmethod
    def _parse_chunk_fields(chunk: str) -> Dict[str, Any]:
        fields: Dict[str, Any] = {}
        if not chunk:
            return fields

        patterns = {
            "invoice_number": r"Invoice Number:\s*(.+)",
            "vendor_name": r"Vendor:\s*(.+?)(?=\nInvoice Date:|\nCurrency:|\nAmount:|$)",
            "invoice_date": r"Invoice Date:\s*(.+)",
            "currency": r"Currency:\s*(.+)",
            "total_amount": r"Amount:\s*(.+)",
        }
        for key, pattern in patterns.items():
            match = re.search(pattern, chunk, re.IGNORECASE | re.DOTALL)
            if match:
                fields[key] = match.group(1).strip()

        if "total_amount" in fields:
            fields["total_amount"] = AzureSearchService._parse_amount(
                fields["total_amount"]
            )

        fields["line_items"] = AzureSearchService._parse_line_items(chunk)
        return fields

    def normalize_hit(self, hit: dict) -> Dict[str, Any]:
        """
        Normalize an Azure Search document into a stable shape for the assistant.
        Index fields observed:
        invoiceNumber, vendorName, invoiceDate, currency, amount, status, blobUrl, chunk
        """
        chunk = self._pick(hit, "chunk", "content", "Content", "text", default="")
        if isinstance(chunk, dict):
            chunk = json.dumps(chunk)
        elif chunk and not isinstance(chunk, str):
            chunk = str(chunk)

        parsed_json = None
        if isinstance(chunk, str) and chunk.strip().startswith("{"):
            try:
                parsed_json = json.loads(chunk)
            except Exception:
                parsed_json = None

        chunk_fields = self._parse_chunk_fields(chunk if isinstance(chunk, str) else "")

        invoice_number = self._clean_text(
            self._pick(
                hit,
                "invoiceNumber",
                "invoice_number",
                default=(
                    parsed_json.get("invoice_number")
                    if isinstance(parsed_json, dict)
                    else chunk_fields.get("invoice_number")
                ),
            )
        )
        vendor_name = self._clean_text(
            self._pick(
                hit,
                "vendorName",
                "vendor_name",
                default=(
                    parsed_json.get("vendor_name")
                    if isinstance(parsed_json, dict)
                    else chunk_fields.get("vendor_name")
                ),
            )
        )
        invoice_date = self._clean_text(
            self._pick(
                hit,
                "invoiceDate",
                "invoice_date",
                default=(
                    parsed_json.get("invoice_date")
                    if isinstance(parsed_json, dict)
                    else chunk_fields.get("invoice_date")
                ),
            )
        )
        if invoice_date and "T" in invoice_date:
            invoice_date = invoice_date.split("T", 1)[0]

        currency = self._clean_text(
            self._pick(
                hit,
                "currency",
                default=(
                    parsed_json.get("currency")
                    if isinstance(parsed_json, dict)
                    else chunk_fields.get("currency")
                ),
            )
        )
        total_amount = self._parse_amount(
            self._pick(
                hit,
                "amount",
                "total_amount",
                "totalAmount",
                default=(
                    parsed_json.get("total_amount")
                    if isinstance(parsed_json, dict)
                    else chunk_fields.get("total_amount")
                ),
            )
        )
        processing_status = self._clean_text(
            self._pick(
                hit,
                "status",
                "processing_status",
                "processingStatus",
                default=(
                    parsed_json.get("processing_status")
                    if isinstance(parsed_json, dict)
                    else None
                ),
            )
        ) or "Uploaded"

        blob_url = self._pick(
            hit,
            "blobUrl",
            "blob_url",
            "metadata_storage_path",
            "url",
            "source_url",
        )
        if isinstance(parsed_json, dict):
            blob_url = blob_url or self._pick(parsed_json, "blob_url", "blobUrl")

        blob_name = self._pick(hit, "blob_name", "blobName", "metadata_storage_name")
        blob_name = blob_name or self._blob_name_from_url(blob_url)

        line_items = []
        if isinstance(parsed_json, dict):
            line_items = (
                parsed_json.get("line_items")
                or parsed_json.get("lineItems")
                or []
            )
        if not line_items:
            line_items = chunk_fields.get("line_items") or []

        return {
            "id": self._pick(hit, "id", "Id"),
            "score": hit.get("@search.score"),
            "content": chunk,
            "blob_url": blob_url,
            "blob_name": blob_name,
            "invoice_number": invoice_number,
            "vendor_name": vendor_name,
            "invoice_date": invoice_date,
            "currency": currency,
            "total_amount": total_amount,
            "processing_status": processing_status,
            "line_items": line_items,
            "raw": hit,
        }

    def search(self, query: str, top: int = 8) -> List[dict]:
        results = self.client.search(
            search_text=query or "*",
            top=top,
            include_total_count=True,
        )
        return [self.normalize_hit(dict(result)) for result in results]

    def search_by_invoice_number(self, invoice_number: str) -> List[dict]:
        return self.search(invoice_number, top=5)

    def search_by_vendor(self, vendor_name: str) -> List[dict]:
        return self.search(vendor_name, top=10)
