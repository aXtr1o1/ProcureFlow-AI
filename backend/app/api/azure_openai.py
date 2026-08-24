from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.services.azure_openai_service import AzureOpenAIService
from app.services.azure_search_service import AzureSearchService
from app.services.invoice_service import InvoiceService
from app.services.currency_service import to_zar, normalize_currency_code


class ChatRequest(BaseModel):
    message: str


router = APIRouter(
    prefix="/azure-openai",
    tags=["Azure OpenAI"]
)


def _sources_from_docs(db: Session, docs: List[dict]) -> List[Dict[str, Any]]:
    invoice_service = InvoiceService(db)
    sources = []

    for doc in docs:
        content = str(doc.get("content") or "")
        invoice_number = doc.get("invoice_number")
        db_invoice = None

        if invoice_number:
            try:
                db_invoice = invoice_service.get_invoice_by_number(
                    str(invoice_number)
                )
            except Exception:
                db_invoice = None

        blob_name = doc.get("blob_name") or (
            db_invoice.blob_name if db_invoice else None
        )
        blob_url = doc.get("blob_url") or (
            db_invoice.blob_url if db_invoice else None
        )

        line_items = doc.get("line_items") or []
        if not line_items and db_invoice:
            try:
                line_items = [
                    {
                        "description": item.description,
                        "quantity": item.quantity,
                        "unit_price": item.unit_price,
                        "amount": item.amount,
                    }
                    for item in invoice_service.get_invoice_line_items(db_invoice.id)
                ]
            except Exception:
                line_items = []

        source_currency = normalize_currency_code(
            doc.get("currency")
            or (db_invoice.currency if db_invoice else None)
            or "ZAR"
        )
        total_amount = (
            doc.get("total_amount")
            if doc.get("total_amount") is not None
            else (db_invoice.total_amount if db_invoice else None)
        )
        total_amount_zar = (
            to_zar(total_amount, source_currency)
            if total_amount is not None
            else None
        )
        line_items_zar = []
        for item in line_items:
            if not isinstance(item, dict):
                continue
            line_items_zar.append(
                {
                    "description": item.get("description"),
                    "quantity": item.get("quantity"),
                    "unit_price": to_zar(item.get("unit_price"), source_currency),
                    "amount": to_zar(
                        item.get("amount")
                        if item.get("amount") is not None
                        else item.get("unit_price"),
                        source_currency,
                    ),
                }
            )

        sources.append(
            {
                "id": db_invoice.id if db_invoice else None,
                "azure_id": str(doc.get("id")) if doc.get("id") is not None else None,
                "invoice_number": str(
                    invoice_number
                    or (db_invoice.invoice_number if db_invoice else "")
                    or ""
                )
                or None,
                "vendor_name": str(
                    doc.get("vendor_name")
                    or (db_invoice.vendor_name if db_invoice else "")
                    or ""
                ).replace("\n", " ")
                or None,
                "invoice_date": str(
                    doc.get("invoice_date")
                    or (db_invoice.invoice_date if db_invoice else "")
                    or ""
                )
                or None,
                "currency": "ZAR",
                "original_currency": source_currency,
                "total_amount": total_amount_zar,
                "processing_status": str(
                    doc.get("processing_status")
                    or (db_invoice.processing_status if db_invoice else "")
                    or ""
                )
                or None,
                "blob_url": blob_url,
                "blob_name": blob_name,
                "score": doc.get("score"),
                "line_items": line_items_zar,
                "snippet": content[:280],
            }
        )

    return sources


@router.get("/test")
def test_connection():
    service = AzureOpenAIService()

    try:
        response = service.chat(
            "Reply with exactly: Azure OpenAI connection successful."
        )
        return {
            "success": True,
            "response": response,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )


@router.post("/chat")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db),
):
    """
    Assistant RAG flow:
    1) LLM rewrites the user question into an optimized Azure AI Search query
    2) Azure AI Search retrieves documents (including blob_url)
    3) LLM answers using the retrieved information
    """
    openai_service = AzureOpenAIService()
    search_service = AzureSearchService(db)

    message = (request.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required.")

    search_query = message
    documents: List[dict] = []
    search_error = None

    try:
        # 1) Optimize query (fall back to original message on failure)
        try:
            search_query = openai_service.rewrite_search_query(message)
        except Exception as rewrite_error:
            search_query = message
            search_error = f"Query rewrite skipped: {rewrite_error}"

        # 2) Retrieve from Azure AI Search
        try:
            documents = search_service.search(search_query, top=5) or []
            if not documents and search_query != message:
                documents = search_service.search(message, top=5) or []
        except Exception as search_exc:
            search_error = str(search_exc)
            documents = []

        # Normalize retrieved docs to ZAR so the LLM cites Rand amounts
        zar_documents: List[dict] = []
        for doc in documents:
            currency = normalize_currency_code(doc.get("currency") or "ZAR")
            converted = dict(doc)
            converted["original_currency"] = currency
            converted["currency"] = "ZAR"
            if doc.get("total_amount") is not None:
                converted["total_amount"] = to_zar(doc.get("total_amount"), currency)
            line_items = []
            for item in doc.get("line_items") or []:
                if not isinstance(item, dict):
                    continue
                line = dict(item)
                line["unit_price"] = to_zar(item.get("unit_price"), currency)
                line["amount"] = to_zar(
                    item.get("amount")
                    if item.get("amount") is not None
                    else item.get("unit_price"),
                    currency,
                )
                line_items.append(line)
            converted["line_items"] = line_items
            zar_documents.append(converted)
        documents = zar_documents

        # 3) Grounded answer (or plain chat if no docs)
        if documents:
            answer = openai_service.answer_with_context(
                question=message,
                documents=documents,
                search_query=search_query,
            )
        else:
            answer = openai_service.chat(
                f"""The user asked: {message}

Azure AI Search returned no usable documents.
{f"Search note: {search_error}" if search_error else ""}
Answer helpfully based on general invoice/procurement knowledge,
and say that no indexed invoice documents were retrieved."""
            )

        return {
            "success": True,
            "response": str(answer or ""),
            "search_query": str(search_query or message),
            "sources": _sources_from_docs(db, documents),
            "total_sources": len(documents),
            "warning": search_error,
        }
    except Exception as e:

        print("Azure OpenAI Error:", e)

        raise HTTPException(
            status_code=500,
            detail=str(e),
        )
