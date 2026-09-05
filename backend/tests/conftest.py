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
os.environ.setdefault("FX_TO_USD_ZAR", "18")
os.environ.setdefault("FX_TO_USD_AED", "3.67")
os.environ.setdefault("FX_TO_USD_EUR", "0.92")
os.environ.setdefault("FX_TO_USD_GBP", "0.79")
os.environ.setdefault("FX_TO_USD_SAR", "3.75")


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