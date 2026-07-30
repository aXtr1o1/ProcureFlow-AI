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

        response = self.client.responses.create(
            model=self.model,
            input=prompt
        )

        return response.output_text