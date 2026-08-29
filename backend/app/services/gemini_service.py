from typing import Any, Dict, List

from google import genai

from app.core.config import settings


class GeminiService:
    """
    Service responsible for interacting with Google Gemini.

    Gemini is used for:
    - General invoice assistant chat
    - Search query rewriting
    - Answer generation using retrieved invoice context
    """

    def __init__(self):
        api_key = settings.GEMINI_API_KEY.strip()

        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")

        self.client = genai.Client(
            api_key=api_key
        )

        self.model = settings.GEMINI_MODEL.strip()

        if not self.model:
            raise ValueError("GEMINI_MODEL is not configured.")

    def _complete(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        """
        Send a prompt to Gemini and return the generated text.
        """

        combined_prompt = f"""
{system_prompt}

User:
{user_prompt}
"""

        response = self.client.models.generate_content(
            model=self.model,
            contents=combined_prompt,
        )

        return (response.text or "").strip()

    # ==========================================================
    # General Chat
    # ==========================================================

    def chat(self, prompt: str) -> str:
        """
        Answer general invoice/procurement questions using Gemini.
        """

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

        return self._complete(
            system_prompt,
            prompt,
        )

    # ==========================================================
    # Search Query Rewriting
    # ==========================================================

    def rewrite_search_query(
        self,
        question: str,
    ) -> str:
        """
        Convert a natural-language assistant question
        into a short Azure AI Search keyword query.
        """

        system_prompt = """
You rewrite user questions into short Azure AI Search
keyword queries for invoices.

Return ONLY the search keywords.

Rules:
- No quotes
- No markdown
- No explanation
- Maximum 12 words
"""

        rewritten = self._complete(
            system_prompt,
            question,
        )

        # Defensive cleanup if Gemini adds a label
        for prefix in (
            "Search query:",
            "Query:",
            "Optimized query:",
        ):
            if rewritten.lower().startswith(prefix.lower()):
                rewritten = rewritten[len(prefix):].strip()

        return (
            rewritten
            .strip()
            .strip('"')
            .strip("'")
            or question.strip()
        )

    # ==========================================================
    # Answer Using Retrieved Context
    # ==========================================================

    def answer_with_context(
        self,
        question: str,
        documents: List[Dict[str, Any]],
        search_query: str,
    ) -> str:
        """
        Answer the user's question using documents
        retrieved from Azure AI Search.
        """

        if not documents:
            context = (
                "No documents were retrieved from "
                "Azure AI Search."
            )

        else:
            blocks = []

            for index, doc in enumerate(
                documents,
                start=1,
            ):
                line_items = doc.get("line_items") or []

                line_preview = "; ".join(
                    [
                        (
                            f"{item.get('description')} "
                            f"(qty {item.get('quantity')}, "
                            f"{item.get('unit_price')})"
                        )
                        for item in line_items[:4]
                        if isinstance(item, dict)
                    ]
                )

                blocks.append(
                    "\n".join(
                        [
                            f"[Source {index}]",
                            (
                                f"invoice_number: "
                                f"{doc.get('invoice_number')}"
                            ),
                            (
                                f"vendor_name: "
                                f"{doc.get('vendor_name')}"
                            ),
                            (
                                f"invoice_date: "
                                f"{doc.get('invoice_date')}"
                            ),
                            "currency: USD",
                            (
                                f"total_amount: "
                                f"{doc.get('total_amount')} "
                                "(US Dollars)"
                            ),
                            (
                                f"processing_status: "
                                f"{doc.get('processing_status')}"
                            ),
                            (
                                f"blob_name: "
                                f"{doc.get('blob_name')}"
                            ),
                            (
                                f"line_items: "
                                f"{line_preview or 'n/a'}"
                            ),
                            (
                                f"content: "
                                f"{str(doc.get('content') or '')[:1200]}"
                            ),
                        ]
                    )
                )

            context = "\n\n".join(blocks)

        system_prompt = """
You are an AI Invoice Assistant with access
to retrieved invoice documents.

Use ONLY the provided retrieved context to answer.

If the context is incomplete, say what is missing.

Formatting rules:

- Write like ChatGPT.
- Use clear prose.
- Use short headings.
- Use scannable bullets.
- Start with a brief direct answer.
- Use markdown-style structure.
- Use ## headings.
- Use - bullets.
- Use **bold** for key labels.
- NEVER paste full blob URLs.
- NEVER paste long Azure storage links.
- Cite invoices by invoice number, vendor, date,
  and amount only.
- All money amounts must be shown in US Dollars
  using $ or USD.
- Do not show ZAR, AED, EUR, or other currencies.
- Tell the user to use the "Retrieved sources"
  cards for PDF/Open links.

For duplicates, use:

## Duplicates found

1. **Invoice:** <number>
   - Vendor: <name>
   - Date: <date>
   - Amount: $<amount>
   - Occurrences: <n>

Keep answers concise and practical for
procurement and AP workflows.

If no documents were retrieved, say so clearly,
then provide helpful next steps.
"""

        user_prompt = f"""
Original question:

{question}

Optimized Azure AI Search query used:

{search_query}

Retrieved context:

{context}

Answer the original question using the
retrieved context.

Follow the formatting rules strictly.

Do not include raw URLs.
"""

        return self._complete(
            system_prompt,
            user_prompt,
        )