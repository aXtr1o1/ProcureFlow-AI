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
    ACCESS_TOKEN_EXPIRE_MINUTES: int 

   # Canonical default currency
    DEFAULT_CURRENCY: str = "USD"

    # FX conversion rates to USD
    FX_TO_USD_USD: float
    FX_TO_USD_ZAR: float
    FX_TO_USD_AED: float
    FX_TO_USD_EUR: float
    FX_TO_USD_GBP: float
    FX_TO_USD_SAR: float

    class Config:
        env_file = ".env"

settings = Settings()
