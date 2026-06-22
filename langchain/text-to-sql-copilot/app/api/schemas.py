from typing import Any

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500, examples=["What was total revenue by country?"])


class QueryResponse(BaseModel):
    question: str
    sql: str | None
    answer: str
    columns: list[str] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    relevant_tables: list[str] = Field(default_factory=list)
    llm_calls: int = 0
    retry_count: int = 0
    cached: bool = False


class CacheStatsResponse(BaseModel):
    enabled: bool
    size: int
    max_size: int
    ttl_seconds: int


class HealthResponse(BaseModel):
    status: str
    database: str
    llm_provider: str
