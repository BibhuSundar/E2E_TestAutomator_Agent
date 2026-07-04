from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # JWT
    secret_key: str = "test-automator-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 8  # 8 hours

    # OpenAI
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4o"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # Groq
    groq_api_key: Optional[str] = None
    groq_model: str = "llama3-8b-8192"

    # Default LLM provider: "openai" | "ollama" | "groq"
    default_llm_provider: str = "openai"

    # App
    app_name: str = "Test Automator"
    users_file: str = "data/users.json"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
