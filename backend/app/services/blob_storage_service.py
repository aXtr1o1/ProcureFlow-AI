from azure.storage.blob import BlobServiceClient
from fastapi import UploadFile
from app.core.config import settings
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceExistsError
import uuid
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
            print(f"Container '{self.container_name}' created.")
        except ResourceExistsError:
            print(f"Container '{self.container_name}' already exists.")

    # --------------------------------------------------
    # Upload Invoice
    # --------------------------------------------------

    async def upload_invoice(self, file: UploadFile):

        file_extension = file.filename.split(".")[-1]

        blob_name = f"{uuid.uuid4()}.{file_extension}"

        blob_client = self.container_client.get_blob_client(blob_name)

        file_data = await file.read()

        blob_client.upload_blob(file_data, overwrite=True)

        return {
            "blob_name": blob_name,
            "blob_url": blob_client.url
        }

    # --------------------------------------------------
    # Download Blob
    # --------------------------------------------------

    def download_invoice(self, blob_name: str):

        blob_client = self.container_client.get_blob_client(blob_name)

        return blob_client.download_blob().readall()

    # --------------------------------------------------
    # Delete Blob
    # --------------------------------------------------

    def delete_invoice(self, blob_name: str):

        blob_client = self.container_client.get_blob_client(blob_name)

        blob_client.delete_blob()

        return True

    # --------------------------------------------------
    # List Uploaded Files
    # --------------------------------------------------

    def list_invoices(self):

        blobs = []

        for blob in self.container_client.list_blobs():

            blobs.append(blob.name)

        return blobs