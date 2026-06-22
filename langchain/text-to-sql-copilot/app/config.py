from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Text-to-SQL Copilot"
    app_env: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    database_url: str = "postgresql+asyncpg://copilot:changeme@localhost:5432/sales_db"
    database_admin_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/sales_db"

    llm_provider: Literal["ollama", "groq"] = "ollama"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    groq_api_key: str = ""
    groq_model: str = "llama-3.1-8b-instant"

    max_sql_retries: int = 2
    max_result_rows: int = 100
    sql_timeout_seconds: int = 10
    max_question_length: int = 500

    cache_enabled: bool = True
    cache_ttl_seconds: int = 300
    cache_max_size: int = 256

    cors_origins: str = "*"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
