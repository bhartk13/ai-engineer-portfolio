from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.runner import run_agent
from app.api.schemas import CacheStatsResponse, HealthResponse, QueryRequest, QueryResponse
from app.config import get_settings
from app.db.engine import get_db_session
from app.logging_config import get_logger
from app.services.cache_factory import get_query_cache
from app.services.query_cache import is_cacheable_response

logger = get_logger(__name__)
settings = get_settings()

router = APIRouter()


def _to_response(question: str, payload: dict, cached: bool = False) -> QueryResponse:
    return QueryResponse(
        question=question,
        sql=payload.get("sql"),
        answer=payload.get("answer", "No answer generated."),
        columns=payload.get("columns", []),
        rows=payload.get("rows", []),
        relevant_tables=payload.get("relevant_tables", []),
        llm_calls=payload.get("llm_calls", 0),
        retry_count=payload.get("retry_count", 0),
        cached=cached,
    )


@router.get("/health", response_model=HealthResponse)
async def health(session: AsyncSession = Depends(get_db_session)) -> HealthResponse:
    db_status = "ok"
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"
    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        database=db_status,
        llm_provider=settings.llm_provider,
    )


@router.get("/cache/stats", response_model=CacheStatsResponse)
async def cache_stats() -> CacheStatsResponse:
    stats = get_query_cache().stats()
    return CacheStatsResponse(enabled=settings.cache_enabled, **stats)


@router.delete("/cache")
async def clear_cache() -> dict:
    """Clear cached query responses (useful after schema/data changes)."""
    removed = get_query_cache().clear()
    logger.info("cache_cleared", entries=removed)
    return {"cleared": removed}


@router.post("/query", response_model=QueryResponse)
async def query(
    body: QueryRequest,
    session: AsyncSession = Depends(get_db_session),
    x_cache_bypass: str | None = Header(default=None, alias="X-Cache-Bypass"),
) -> QueryResponse:
    question = body.question.strip()
    if len(question) > settings.max_question_length:
        raise HTTPException(status_code=400, detail="Question too long.")

    bypass = x_cache_bypass is not None and x_cache_bypass.lower() in {"1", "true", "yes"}
    cache = get_query_cache()

    if settings.cache_enabled and not bypass:
        cached_payload = cache.get(question)
        if cached_payload is not None:
            logger.info("cache_hit", question=question[:100])
            return _to_response(question, cached_payload, cached=True)

    logger.info("query_received", question=question[:100], cache_bypass=bypass)

    try:
        result = await run_agent(question, session)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("agent_error")
        raise HTTPException(status_code=500, detail="Agent failed to process question.") from exc

    payload = {
        "sql": result.get("sql"),
        "answer": result.get("answer", "No answer generated."),
        "columns": result.get("columns", []),
        "rows": result.get("rows", []),
        "relevant_tables": result.get("relevant_tables", []),
        "llm_calls": result.get("llm_calls", 0),
        "retry_count": result.get("retry_count", 0),
    }

    if settings.cache_enabled and is_cacheable_response(payload):
        cache.set(question, payload)
        logger.info("cache_store", question=question[:100])

    return _to_response(question, payload, cached=False)
