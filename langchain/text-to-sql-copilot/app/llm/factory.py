from langchain_core.language_models.chat_models import BaseChatModel
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama

from app.config import Settings, get_settings


def create_llm(settings: Settings | None = None) -> BaseChatModel:
    """Factory for cost-efficient LLM backends."""
    cfg = settings or get_settings()

    if cfg.llm_provider == "groq":
        if not cfg.groq_api_key:
            raise ValueError("GROQ_API_KEY is required when LLM_PROVIDER=groq")
        return ChatGroq(
            model=cfg.groq_model,
            api_key=cfg.groq_api_key,
            temperature=0,
            max_tokens=512,
        )

    return ChatOllama(
        base_url=cfg.ollama_base_url,
        model=cfg.ollama_model,
        temperature=0,
        num_predict=512,
    )
