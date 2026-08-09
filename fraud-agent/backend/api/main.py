"""
main.py
-------
FastAPI service exposing the fraud investigation agent over HTTP.
Run with:  uvicorn backend.api.main:app --reload --port 8000
"""
from __future__ import annotations
from pathlib import Path
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.agent.graph_store import GraphStore
from backend.agent.graph_rag import GraphRAG
from backend.agent.auth import User, PermissionDenied
from backend.agent.audit import AuditLog
from backend.agent.tools import ToolExecutor
from backend.agent.orchestrator import FraudInvestigationAgent, AgentMemory

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "sample_data.json"

app = FastAPI(title="Fraud Investigation Agent API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

# Process-lifetime singletons — swap for a per-request session store in production.
_graph_store = GraphStore(DATA_PATH)
_graph_rag = GraphRAG(_graph_store)
_audit_log = AuditLog()
_sessions: dict[str, AgentMemory] = {}

# Demo users, standing in for real auth/IdP-issued identities.
_DEMO_USERS = {
    "analyst-1": User("analyst-1", "analyst"),
    "senior-1": User("senior-1", "senior_investigator"),
    "viewer-1": User("viewer-1", "viewer"),
}


def _get_user(x_user_id: str | None) -> User:
    user = _DEMO_USERS.get(x_user_id or "analyst-1")
    if not user:
        raise HTTPException(401, "unknown user")
    return user


class InvestigateRequest(BaseModel):
    message: str
    session_id: str = "default"


@app.post("/investigate")
def investigate(req: InvestigateRequest, x_user_id: str | None = Header(default=None)):
    user = _get_user(x_user_id)
    memory = _sessions.setdefault(req.session_id, AgentMemory())
    executor = ToolExecutor(_graph_store, _graph_rag, _audit_log, user)
    agent = FraudInvestigationAgent(executor, memory)
    try:
        result = agent.investigate(req.message)
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    return result


@app.get("/graph")
def get_full_graph():
    nodes = [dict(_graph_store.graph.nodes[n], id=n) for n in _graph_store.graph.nodes]
    edges = [{"source": u, "target": v, **d} for u, v, d in _graph_store.graph.edges(data=True)]
    return {"nodes": nodes, "edges": edges}


@app.get("/graph/{entity_id}")
def get_entity_neighborhood(entity_id: str, hops: int = 1):
    result = _graph_store.neighbors(entity_id, hops=hops)
    if not result["nodes"]:
        raise HTTPException(404, "entity not found")
    return result


@app.get("/audit-log")
def get_audit_log(x_user_id: str | None = Header(default=None)):
    from backend.agent.auth import Permission, require
    user = _get_user(x_user_id)
    try:
        require(user, Permission.VIEW_AUDIT_LOG)
    except PermissionDenied as e:
        raise HTTPException(403, str(e))
    return _audit_log.all()


@app.get("/healthz")
def healthz():
    return {"status": "ok"}
