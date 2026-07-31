from fastapi import APIRouter, HTTPException

from app.services.azure_openai_service import AzureOpenAIService

router = APIRouter(
    prefix="/azure-openai",
    tags=["Azure OpenAI"]
)


@router.get("/test")
def test_connection():

    service = AzureOpenAIService()

    try:
        response = service.chat(
            "Reply with exactly: Azure OpenAI connection successful."
        )

        return {
            "success": True,
            "response": response
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )