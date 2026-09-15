import os
from unittest.mock import MagicMock, patch


# Test-only environment values
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

os.environ.setdefault(
    "AZURE_STORAGE_CONNECTION_STRING",
    "DefaultEndpointsProtocol=https;"
    "AccountName=testaccount;"
    "AccountKey=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==;"
    "EndpointSuffix=core.windows.net",
)

os.environ.setdefault("AZURE_STORAGE_CONTAINER", "test-container")

os.environ.setdefault(
    "AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT",
    "https://test-document-intelligence.cognitiveservices.azure.com/",
)

os.environ.setdefault("AZURE_DOCUMENT_INTELLIGENCE_KEY", "test-document-key")
os.environ.setdefault("AZURE_DOCUMENT_INTELLIGENCE_LOCATION", "eastus")

os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

os.environ.setdefault(
    "AZURE_SEARCH_ENDPOINT",
    "https://test-search.search.windows.net",
)

os.environ.setdefault("AZURE_SEARCH_API_KEY", "test-search-key")
os.environ.setdefault("AZURE_SEARCH_INDEX_NAME", "test-index")

os.environ.setdefault("SECRET_KEY", "test-secret-key")
os.environ.setdefault("ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")

os.environ.setdefault("FX_TO_USD_USD", "1")
os.environ.setdefault("FX_CACHE_TTL_SECONDS", "86400")
os.environ.setdefault(
    "FX_RATES_URL",
    "https://cdn.jsdelivr.net/npm/@fawazahmed0/"
    "currency-api@latest/v1/currencies/usd.min.json",
)
# Do not set FX_TO_USD_* overrides — tests use mocked USD-base table.


# Mock Azure Blob Storage
blob_service_client = MagicMock()
blob_service_client.get_container_client.return_value = MagicMock()

blob_patch = patch(
    "azure.storage.blob.BlobServiceClient.from_connection_string",
    return_value=blob_service_client,
)

# Mock Azure Document Intelligence
document_patch = patch(
    "azure.ai.documentintelligence.DocumentIntelligenceClient",
    return_value=MagicMock(),
)

# Mock Azure Search
search_patch = patch(
    "azure.search.documents.SearchClient",
    return_value=MagicMock(),
)

blob_patch.start()
document_patch.start()
search_patch.start()

# Offline FX table for tests (USD-base: 1 USD = N foreign)
_TEST_USD_BASE = {
    "usd": 1.0,
    "eur": 0.92,
    "gbp": 0.79,
    "zar": 18.5,
    "aed": 3.67,
    "sar": 3.75,
    "inr": 83.0,
    "jpy": 150.0,
    "cad": 1.36,
    "aud": 1.52,
    "cny": 7.2,
    "chf": 0.88,
    "sgd": 1.34,
    "hkd": 7.8,
    "nzd": 1.66,
    "sek": 10.5,
    "nok": 10.6,
    "dkk": 6.9,
    "mxn": 17.0,
    "brl": 5.0,
    "krw": 1350.0,
    "try": 32.0,
    "pln": 4.0,
    "thb": 35.0,
    "myr": 4.7,
    "idr": 15800.0,
    "php": 56.0,
    "vnd": 25000.0,
}

fx_patch = patch(
    "app.services.currency_service._usd_base_table",
    return_value=_TEST_USD_BASE,
)
fx_patch.start()