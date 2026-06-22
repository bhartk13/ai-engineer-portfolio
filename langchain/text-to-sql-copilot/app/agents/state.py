from typing import Any, TypedDict


class AgentState(TypedDict, total=False):
    question: str
    relevant_tables: list[str]
    schema_context: str
    sql: str
    sql_valid: bool
    validation_error: str | None
    execution_error: str | None
    columns: list[str]
    rows: list[dict[str, Any]]
    answer: str
    retry_count: int
    llm_calls: int
