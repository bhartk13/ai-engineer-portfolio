from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.language_models.chat_models import BaseChatModel

from app.agents.state import AgentState
from app.config import get_settings
from app.db.schema import TABLE_CATALOG
from app.logging_config import get_logger
from app.services.schema_service import build_schema_context, format_results_as_answer, link_relevant_tables
from app.services.sql_parser import extract_sql_from_llm_response
from app.services.sql_validator import SQLValidationError, validate_sql

logger = get_logger(__name__)
settings = get_settings()

SQL_SYSTEM_PROMPT = """You are a PostgreSQL expert. Generate ONE read-only SELECT query.

Reply with ONLY a JSON object — no markdown, no code fences, no explanation:
{"sql": "SELECT ..."}

Rules:
- Use ONLY tables/columns from the schema below
- Always include LIMIT (max 100)
- Use plain columns and GROUP BY — NOT json_build_object
- Revenue = SUM(order_items.quantity * order_items.unit_price)
- Join: customers -> orders -> order_items
- Use single-quoted string literals in SQL
- No INSERT, UPDATE, DELETE, DROP, or DDL

Example (revenue by country):
{"sql": "SELECT c.country, SUM(oi.quantity * oi.unit_price) AS revenue FROM customers c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id GROUP BY c.country LIMIT 100"}
"""


def _parse_sql_response(content: str) -> str:
    return extract_sql_from_llm_response(content)


async def link_schema_node(state: AgentState) -> dict:
    """Keyword-based schema linking — no LLM call."""
    question = state["question"]
    tables = link_relevant_tables(question)
    schema_context = build_schema_context(tables)
    logger.info("schema_linked", tables=tables)
    return {"relevant_tables": tables, "schema_context": schema_context, "retry_count": state.get("retry_count", 0)}


async def generate_sql_node(state: AgentState, llm: BaseChatModel) -> dict:
    """Single LLM call to generate SQL."""
    question = state["question"]
    schema_context = state["schema_context"]
    retry_count = state.get("retry_count", 0)
    llm_calls = state.get("llm_calls", 0)

    user_parts = [f"Schema:\n{schema_context}", f"Question: {question}"]

    if state.get("validation_error"):
        user_parts.append(f"Previous SQL failed validation: {state['validation_error']}")
        user_parts.append(f"Previous SQL: {state.get('sql', '')}")
        user_parts.append("Return ONLY JSON: {\"sql\": \"SELECT ...\"}. No markdown.")

    if state.get("execution_error"):
        user_parts.append(f"Previous SQL failed at runtime: {state['execution_error']}")
        user_parts.append(f"Previous SQL: {state.get('sql', '')}")

    messages = [
        SystemMessage(content=SQL_SYSTEM_PROMPT),
        HumanMessage(content="\n\n".join(user_parts)),
    ]

    response = await llm.ainvoke(messages)
    sql = _parse_sql_response(response.content)
    logger.info("sql_generated", retry=retry_count, sql_preview=sql[:120])
    return {
        "sql": sql,
        "validation_error": None,
        "execution_error": None,
        "llm_calls": llm_calls + 1,
    }


async def validate_sql_node(state: AgentState) -> dict:
    """Validate SQL without LLM."""
    allowed = set(state.get("relevant_tables", list(TABLE_CATALOG.keys())))
    try:
        cleaned = validate_sql(state["sql"], allowed_tables=allowed)
        return {"sql": cleaned, "sql_valid": True, "validation_error": None}
    except SQLValidationError as exc:
        logger.warning("sql_validation_failed", error=str(exc))
        return {"sql_valid": False, "validation_error": str(exc)}


async def summarize_node(state: AgentState) -> dict:
    """Template-based summary — no extra LLM call."""
    answer = format_results_as_answer(
        state["question"],
        state["sql"],
        state.get("rows", []),
        state.get("columns", []),
    )
    return {"answer": answer}


def should_retry_validation(state: AgentState) -> str:
    if state.get("sql_valid"):
        return "execute"
    retries = state.get("retry_count", 0)
    if retries < settings.max_sql_retries:
        return "retry_generate"
    return "fail"


def should_retry_execution(state: AgentState) -> str:
    if not state.get("execution_error"):
        return "summarize"
    retries = state.get("retry_count", 0)
    if retries < settings.max_sql_retries:
        return "retry_generate"
    return "fail"


async def fail_node(state: AgentState) -> dict:
    errors = []
    if state.get("validation_error"):
        errors.append(f"Validation: {state['validation_error']}")
    if state.get("execution_error"):
        errors.append(f"Execution: {state['execution_error']}")
    msg = "Could not produce a valid SQL answer. " + " | ".join(errors)
    return {"answer": msg, "sql_valid": False}
