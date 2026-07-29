from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceExistsError
from fastapi import UploadFile
from app.core.config import settings
import logging
import json

logger = logging.getLogger(__name__)

class BlobStorageService:

    def __init__(self):
        self.blob_service_client = BlobServiceClient.from_connection_string(
            settings.AZURE_STORAGE_CONNECTION_STRING
        )

        self.container_name = settings.AZURE_STORAGE_CONTAINER

        self.container_client = self.blob_service_client.get_container_client(
            self.container_name
        )

        self._create_container_if_not_exists()

    def _create_container_if_not_exists(self):
        try:
            self.container_client.create_container()
            logger.info(f"Container '{self.container_name}' created.")
        except ResourceExistsError:
            logger.info(f"Container '{self.container_name}' already exists.")

    # --------------------------------------------------
    # Blob Path Helpers
    # --------------------------------------------------

    def _invoice_blob_name(self, document_id: str, extension: str) -> str:
        return f"{settings.AZURE_INVOICE_FOLDER}/{document_id}.{extension}"


    def _ocr_blob_name(self, document_id: str) -> str:
        return f"{settings.AZURE_OCR_FOLDER}/{document_id}.txt"


    def _summary_blob_name(self, document_id: str) -> str:
        return f"{settings.AZURE_SUMMARY_FOLDER}/{document_id}.json"


    def _po_blob_name(self, document_id: str) -> str:
        return f"{settings.AZURE_PO_FOLDER}/{document_id}.json"

    # --------------------------------------------------
    # Upload Invoice
    # --------------------------------------------------

    async def upload_invoice(
        self,
        document_id: str,
        file: UploadFile
    ) -> dict:
        file_extension = file.filename.split(".")[-1]

        blob_name = self._invoice_blob_name(
            document_id,
            file_extension
        )

        blob_client = self.container_client.get_blob_client(blob_name)

        file_data = await file.read()

        blob_client.upload_blob(file_data, overwrite=True)

        return {
            "document_id": document_id,
            "blob_name": blob_name,
            "blob_url": blob_client.url
        }

    # --------------------------------------------------
    # Upload OCR Text
    # --------------------------------------------------

    def upload_ocr_text(
        self,
        document_id: str,
        text: str
    ) -> dict:

        blob_name = self._ocr_blob_name(document_id)

        blob_client = self.container_client.get_blob_client(blob_name)

        blob_client.upload_blob(
            text,
            overwrite=True
        )

        return {
            "document_id": document_id,
            "blob_name": blob_name,
            "blob_url": blob_client.url
        }

    # --------------------------------------------------
    # Upload Summary
    # --------------------------------------------------

    def upload_summary(
        self,
        document_id: str,
        summary: dict
    ) -> dict:

        blob_name = self._summary_blob_name(document_id)

        blob_client = self.container_client.get_blob_client(blob_name)

        blob_client.upload_blob(
            json.dumps(summary, ensure_ascii=False),
            overwrite=True
        )

        return {
            "document_id": document_id,
            "blob_name": blob_name,
            "blob_url": blob_client.url
        }

    # --------------------------------------------------
    # Upload PO Record
    # --------------------------------------------------

    def upload_po_record(
        self,
        document_id: str,
        po_record: dict
    ) -> dict:

        blob_name = self._po_blob_name(document_id)

        blob_client = self.container_client.get_blob_client(blob_name)

        blob_client.upload_blob(
            json.dumps(po_record, ensure_ascii=False),
            overwrite=True
        )

        return {
            "document_id": document_id,
            "blob_name": blob_name,
            "blob_url": blob_client.url
        }

    # --------------------------------------------------
    # Download Blob
    # --------------------------------------------------

    def download_invoice(
        self,
        blob_name: str
    ) -> bytes:

        blob_client = self.container_client.get_blob_client(blob_name)

        return blob_client.download_blob().readall()

    # --------------------------------------------------
    # Download OCR Text
    # --------------------------------------------------

    def download_ocr_text(
        self,
        document_id: str
    ) -> str:

        blob_name = self._ocr_blob_name(document_id)

        blob_client = self.container_client.get_blob_client(blob_name)

        return blob_client.download_blob().readall().decode("utf-8")

    # --------------------------------------------------
    # Delete Blob
    # --------------------------------------------------

    def delete_invoice(
        self,
        blob_name: str
    ) -> bool:

        blob_client = self.container_client.get_blob_client(blob_name)

        blob_client.delete_blob()

        return True

    # --------------------------------------------------
    # List Uploaded Files
    # --------------------------------------------------

    def list_invoices(self) -> list[str]:

        blobs = []

        for blob in self.container_client.list_blobs(
            name_starts_with=settings.AZURE_INVOICE_FOLDER
        ):
            blobs.append(blob.name)

        return blobs