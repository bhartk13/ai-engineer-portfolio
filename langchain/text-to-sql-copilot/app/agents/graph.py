from langgraph.graph import END, StateGraph
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.nodes import (
    fail_node,
    generate_sql_node,
    link_schema_node,
    should_retry_execution,
    should_retry_validation,
    summarize_node,
    validate_sql_node,
)
from app.agents.state import AgentState
from app.llm.factory import create_llm
from app.logging_config import get_logger
from app.services.query_executor import execute_readonly_query

logger = get_logger(__name__)


async def execute_sql_node(state: AgentState, session: AsyncSession) -> dict:
    try:
        columns, rows = await execute_readonly_query(session, state["sql"])
        logger.info("sql_executed", row_count=len(rows))
        return {"columns": columns, "rows": rows, "execution_error": None}
    except Exception as exc:
        logger.warning("sql_execution_failed", error=str(exc))
        err = str(getattr(exc, "orig", exc))
        if len(err) > 300:
            err = err[:300] + "..."
        return {"execution_error": err}


async def increment_retry_node(state: AgentState) -> dict:
    return {"retry_count": state.get("retry_count", 0) + 1}


def build_graph(session: AsyncSession):
    llm = create_llm()

    async def gen_sql(state: AgentState) -> dict:
        return await generate_sql_node(state, llm)

    async def exec_sql(state: AgentState) -> dict:
        return await execute_sql_node(state, session)

    graph = StateGraph(AgentState)

    graph.add_node("link_schema", link_schema_node)
    graph.add_node("generate_sql", gen_sql)
    graph.add_node("validate_sql", validate_sql_node)
    graph.add_node("execute_sql", exec_sql)
    graph.add_node("summarize", summarize_node)
    graph.add_node("increment_retry", increment_retry_node)
    graph.add_node("fail", fail_node)

    graph.set_entry_point("link_schema")
    graph.add_edge("link_schema", "generate_sql")
    graph.add_edge("generate_sql", "validate_sql")

    graph.add_conditional_edges(
        "validate_sql",
        should_retry_validation,
        {"execute": "execute_sql", "retry_generate": "increment_retry", "fail": "fail"},
    )

    graph.add_edge("increment_retry", "generate_sql")

    graph.add_conditional_edges(
        "execute_sql",
        should_retry_execution,
        {"summarize": "summarize", "retry_generate": "increment_retry", "fail": "fail"},
    )

    graph.add_edge("summarize", END)
    graph.add_edge("fail", END)

    return graph.compile()
