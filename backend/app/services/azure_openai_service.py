from openai import OpenAI

from app.core.config import settings


class AzureOpenAIService:

    def __init__(self):

        self.client = OpenAI(
            base_url=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY
        )

        self.model = settings.AZURE_OPENAI_DEPLOYMENT_NAME

    def chat(self, prompt: str) -> str:
        system_prompt = """
    You are an AI Invoice Assistant.

    You answer questions about:

    - invoices
    - purchase orders
    - vendors
    - approvals
    - procurement
    - finance
    - accounting

    If the user asks a general question,
    answer it naturally.
    """

        response = self.client.responses.create(
            model=self.model,
            input=f"{system_prompt}\n\nUser: {prompt}"
        )

        return response.output_text