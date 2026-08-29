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

    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

    AZURE_SEARCH_ENDPOINT: str
    AZURE_SEARCH_API_KEY: str
    AZURE_SEARCH_INDEX_NAME: str

    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Canonical display and storage currency
    DEFAULT_DISPLAY_CURRENCY: str = "USD"
    FX_TO_USD_USD: float = 1.0
    FX_TO_USD_ZAR: float = 1 / 18.50
    FX_TO_USD_AED: float = 1 / 5.05
    FX_TO_USD_EUR: float = 1 / 20.00
    FX_TO_USD_GBP: float = 1 / 23.50
    FX_TO_USD_SAR: float = 1 / 4.93

    class Config:
        env_file = ".env"

settings = Settings()
