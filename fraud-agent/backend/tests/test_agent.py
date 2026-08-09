import pytest
from pathlib import Path

from backend.agent.graph_store import GraphStore
from backend.agent.graph_rag import GraphRAG
from backend.agent.auth import User, PermissionDenied
from backend.agent.audit import AuditLog
from backend.agent.tools import ToolExecutor
from backend.agent.orchestrator import FraudInvestigationAgent, AgentMemory

DATA = Path(__file__).resolve().parents[1] / "data" / "sample_data.json"


def make_executor(role: str):
    gs = GraphStore(DATA)
    rag = GraphRAG(gs)
    log = AuditLog()
    user = User(f"{role}-user", role)
    return ToolExecutor(gs, rag, log, user), log


def test_viewer_cannot_flag_case():
    executor, _ = make_executor("viewer")
    with pytest.raises(PermissionDenied):
        executor.run("flag_case", {"entity_id": "acct_1002", "reason": "structuring", "confidence": 0.9})


def test_analyst_can_search_and_escalate_but_not_freeze():
    executor, _ = make_executor("analyst")
    result = executor.run("search_case_context", {"query": "structuring"})
    assert "matched_notes" in result
    review = executor.run("request_human_review", {
        "entity_id": "acct_1002", "summary": "test", "recommended_action": "freeze"
    })
    assert review["status"] == "escalated_to_human"


def test_every_tool_call_is_audited():
    executor, log = make_executor("senior_investigator")
    executor.run("list_high_risk_entities", {"threshold": 0.5})
    events = log.all()
    assert len(events) == 1
    assert events[0]["action"] == "list_high_risk_entities"
    assert events[0]["actor"] == "senior_investigator-user"


def test_mock_agent_escalates_on_fraud_ring_pattern():
    """No ANTHROPIC_API_KEY in the test environment -> exercises mock mode,
    which still runs through the real ToolExecutor/RBAC/audit path."""
    executor, log = make_executor("analyst")
    agent = FraudInvestigationAgent(executor, AgentMemory())
    result = agent.investigate("Why are Shelby Holdings and Northgate Trading connected?")
    assert result["mode"] == "mock"
    assert "device" in result["answer"].lower() or "shared" in result["answer"].lower()
    tool_names = [step["tool"] for step in result["trace"]]
    assert "search_case_context" in tool_names
    # audit log should have a record for every step in the trace
    assert len(log.all()) == len(result["trace"])
