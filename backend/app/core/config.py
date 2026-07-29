from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str

    AZURE_STORAGE_CONNECTION_STRING: str
    AZURE_STORAGE_CONTAINER: str

    # Blob Storage Folder Structure
    AZURE_INVOICE_FOLDER: str = "Invoices"
    AZURE_PO_FOLDER: str = "PO-Records"
    AZURE_SUMMARY_FOLDER: str = "Summaries"
    AZURE_OCR_FOLDER: str = "OCR Text"

    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str
    AZURE_DOCUMENT_INTELLIGENCE_KEY: str
    AZURE_DOCUMENT_INTELLIGENCE_LOCATION: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()