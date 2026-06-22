from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings

settings = get_settings()


async def execute_readonly_query(session: AsyncSession, sql: str) -> tuple[list[str], list[dict[str, Any]]]:
    """Execute validated SQL with timeout and row cap."""
    timeout_ms = settings.sql_timeout_seconds * 1000
    try:
        await session.execute(text(f"SET LOCAL statement_timeout = {timeout_ms}"))
        result = await session.execute(text(sql))
        columns = list(result.keys())
        rows_raw = result.fetchmany(settings.max_result_rows + 1)

        if len(rows_raw) > settings.max_result_rows:
            rows_raw = rows_raw[: settings.max_result_rows]

        rows = [dict(zip(columns, row)) for row in rows_raw]
        return columns, rows
    except Exception:
        await session.rollback()
        raise
