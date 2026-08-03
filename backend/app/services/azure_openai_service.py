from typing import Any, Dict, List

from openai import OpenAI

from app.core.config import settings


class AzureOpenAIService:

    def __init__(self):
        self.client = OpenAI(
            base_url=settings.AZURE_OPENAI_ENDPOINT.strip(),
            api_key=settings.AZURE_OPENAI_API_KEY.strip(),
        )
        self.model = settings.AZURE_OPENAI_DEPLOYMENT_NAME.strip()

    def _complete(self, system_prompt: str, user_prompt: str) -> str:
        response = self.client.responses.create(
            model=self.model,
            input=f"{system_prompt}\n\nUser: {user_prompt}",
        )
        return (response.output_text or "").strip()

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
        return self._complete(system_prompt, prompt)

    def rewrite_search_query(self, question: str) -> str:
        """
        Turn a natural-language assistant question into a short Azure AI Search query.
        """
        system_prompt = """
You rewrite user questions into short Azure AI Search keyword queries for invoices.

Return ONLY the search keywords.
No quotes, markdown, or explanation.
Max 12 words.
"""
        rewritten = self._complete(system_prompt, question)
        # Defensive cleanup if the model adds labels
        for prefix in ("Search query:", "Query:", "Optimized query:"):
            if rewritten.lower().startswith(prefix.lower()):
                rewritten = rewritten[len(prefix):].strip()
        return rewritten.strip().strip('"').strip("'") or question.strip()

    def answer_with_context(
        self,
        question: str,
        documents: List[Dict[str, Any]],
        search_query: str,
    ) -> str:
        """
        Answer using retrieved Azure Search documents (including blob URLs).
        """
        if not documents:
            context = "No documents were retrieved from Azure AI Search."
        else:
            blocks = []
            for index, doc in enumerate(documents, start=1):
                line_items = doc.get("line_items") or []
                line_preview = "; ".join(
                    [
                        f"{item.get('description')} (qty {item.get('quantity')}, {item.get('unit_price')})"
                        for item in line_items[:4]
                        if isinstance(item, dict)
                    ]
                )
                blocks.append(
                    "\n".join(
                        [
                            f"[Source {index}]",
                            f"invoice_number: {doc.get('invoice_number')}",
                            f"vendor_name: {doc.get('vendor_name')}",
                            f"invoice_date: {doc.get('invoice_date')}",
                            f"currency: ZAR",
                            f"total_amount: {doc.get('total_amount')} (South African Rand)",
                            f"processing_status: {doc.get('processing_status')}",
                            f"blob_name: {doc.get('blob_name')}",
                            f"line_items: {line_preview or 'n/a'}",
                            f"content: {str(doc.get('content') or '')[:1200]}",
                        ]
                    )
                )
            context = "\n\n".join(blocks)

        system_prompt = """
You are an AI Invoice Assistant with access to retrieved invoice documents.

Use ONLY the provided retrieved context to answer.
If the context is incomplete, say what is missing.

Formatting rules (important — ChatGPT style):
- Write like ChatGPT: clear prose, short headings, scannable bullets
- Start with a brief direct answer (1–2 sentences), then supporting detail
- Use markdown-style structure: ## headings, - bullets, **bold** for key labels
- NEVER paste full blob URLs or long Azure storage links in the answer
- Cite invoices by invoice number, vendor, date, and amount only
- All money amounts must be shown in South African Rand as R / ZAR
  (e.g. **R 1,250.00**). Do not show USD, AED, EUR, or other currencies.
- Tell the user to use the "Retrieved sources" cards below for PDF / Open links
- For duplicates, group like this:

## Duplicates found
1. **Invoice:** <number>
   - Vendor: <name>
   - Date: <date>
   - Amount: R <amount>
   - Occurrences: <n>

- Keep answers concise and practical for procurement / AP workflows
- If no documents were retrieved, say so clearly, then give helpful next steps
"""
        user_prompt = f"""
Original question:
{question}

Optimized Azure AI Search query used:
{search_query}

Retrieved context:
{context}

Answer the original question using the retrieved context.
Follow the formatting rules strictly. Do not include raw URLs.
"""
        return self._complete(system_prompt, user_prompt)
