import re
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config.settings import settings
from support.rag import query_readmes, index_readmes

router = APIRouter(prefix="/api/support", tags=["support"])

GREETING_PATTERN = re.compile(r"^(hi|hello|hey|how are you|howdy|good morning|good evening|good afternoon|what's up|sup|yo)\b", re.IGNORECASE)
GREETING_RESPONSE = "Hello! I am Erica, your support assistant. How can I help you?"

SYSTEM_PROMPT = """You are a helpful support assistant for the Test Automator application.
Answer the user's question based on the provided context from the project's README documentation.
If the context doesn't contain enough information, say so honestly.
Keep answers concise and technical."""

OLLAMA_MODEL = "llama3"


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    if GREETING_PATTERN.match(request.question.strip()):
        return ChatResponse(answer=GREETING_RESPONSE, sources=[])

    index_readmes()

    results = query_readmes(request.question, n_results=5)

    if not results:
        return ChatResponse(answer="I couldn't find any relevant information in the documentation to answer your question.", sources=[])

    context = "\n\n---\n\n".join(
        f"Source: {r['source']} (Section: {r['section']})\n{r['content']}" for r in results
    )

    answer = await _generate_answer(request.question, context)

    sources = [
        {"source": r["source"], "section": r["section"]}
        for r in results
    ]
    return ChatResponse(answer=answer, sources=sources)


async def _generate_answer(question: str, context: str) -> str:
    if settings.groq_api_key:
        return await _groq_answer(question, context)

    answer = await _ollama_answer(question, context)
    if answer:
        return answer

    return _basic_answer(question, context)


async def _ollama_answer(question: str, context: str) -> str | None:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/chat",
                json={
                    "model": OLLAMA_MODEL,
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0.3},
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["message"]["content"].strip()
    except Exception:
        pass
    return None


async def _groq_answer(question: str, context: str) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_model,
                "messages": messages,
                "temperature": 0.3,
                "max_tokens": 1024,
            },
        )
        if resp.status_code != 200:
            return _basic_answer(question, context)
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


def _basic_answer(question: str, context: str) -> str:
    import textwrap
    lines = context.split("\n")
    relevant = [l for l in lines if question.lower() in l.lower()]
    if relevant:
        return "Based on the documentation:\n\n" + "\n".join(relevant[:5])
    preview = textwrap.shorten(context, width=600, placeholder="...")
    return f"I found relevant documentation, but no LLM provider is configured for generating a polished answer. Here is the raw context:\n\n{preview}"
