from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    DATABASE_URL: str

    AZURE_STORAGE_CONNECTION_STRING: str
    AZURE_STORAGE_CONTAINER: str

    # Blob Storage Folder Structure
    AZURE_INVOICE_FOLDER: str = "Invoices"
    AZURE_PO_FOLDER: str = "PO-Records"
    AZURE_SUMMARY_FOLDER: str = "Summaries"
    AZURE_OCR_FOLDER: str = "OCR-Text"

    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT: str
    AZURE_DOCUMENT_INTELLIGENCE_KEY: str
    AZURE_DOCUMENT_INTELLIGENCE_LOCATION: str

    AZURE_OPENAI_ENDPOINT: str
    AZURE_OPENAI_API_KEY: str
    AZURE_OPENAI_DEPLOYMENT_NAME: str

    AZURE_SEARCH_ENDPOINT: str
    AZURE_SEARCH_API_KEY: str
    AZURE_SEARCH_INDEX_NAME: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Display / storage currency (South African Rand)
    DEFAULT_DISPLAY_CURRENCY: str = "ZAR"
    FX_TO_ZAR_USD: float = 18.50
    FX_TO_ZAR_AED: float = 5.05
    FX_TO_ZAR_EUR: float = 20.00
    FX_TO_ZAR_GBP: float = 23.50
    FX_TO_ZAR_SAR: float = 4.93
    FX_TO_ZAR_ZAR: float = 1.0

    class Config:
        env_file = ".env"

settings = Settings()