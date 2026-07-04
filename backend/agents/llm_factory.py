"""
LLM factory for CrewAI >= 1.x + LiteLLM.

CrewAI uses LiteLLM internally — Agent(llm=...) must receive a
model-name string. The API keys are injected into os.environ so
LiteLLM can pick them up automatically.

Groq note: prompt caching is not supported by Groq, so we set
  LITELLM_DROP_PARAMS=true  and  cache_control disabled
to strip unsupported fields before the request is sent.
"""
import os
from config.settings import settings

# Tell LiteLLM to silently drop any params unsupported by the provider
os.environ["LITELLM_DROP_PARAMS"] = "true"


def get_llm(provider: str = None) -> str:
    """
    Returns a LiteLLM model-name string for use with CrewAI Agent(llm=...).
    """
    provider = (provider or settings.default_llm_provider).lower().strip()

    if provider == "openai":
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not set in .env")
        os.environ["OPENAI_API_KEY"] = settings.openai_api_key
        return settings.openai_model  # e.g. "gpt-4o"

    elif provider == "groq":
        if not settings.groq_api_key:
            raise ValueError("GROQ_API_KEY is not set in .env")
        os.environ["GROQ_API_KEY"] = settings.groq_api_key
        # groq/ prefix tells LiteLLM to route to Groq
        return f"groq/{settings.groq_model}"  # e.g. "groq/llama3-70b-8192"

    elif provider == "ollama":
        return f"ollama/{settings.ollama_model}"  # e.g. "ollama/llama3"

    else:
        raise ValueError(
            f"Unknown LLM provider: '{provider}'. "
            f"Supported: 'openai', 'groq', 'ollama'"
        )
