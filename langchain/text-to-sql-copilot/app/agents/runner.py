from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import build_graph
from app.agents.state import AgentState
from app.logging_config import get_logger

logger = get_logger(__name__)


async def run_agent(question: str, session: AsyncSession) -> AgentState:
    graph = build_graph(session)
    initial: AgentState = {
        "question": question,
        "retry_count": 0,
        "llm_calls": 0,
    }
    result = await graph.ainvoke(initial)
    logger.info(
        "agent_complete",
        llm_calls=result.get("llm_calls", 0),
        retries=result.get("retry_count", 0),
        has_sql=bool(result.get("sql")),
    )
    return result
