# Ledgerline — Agentic Fraud Investigation Demo

A small, self-contained demo of an agentic AI application over a graph-based
data model, with tool-calling, GraphRAG-style retrieval, RBAC, human-in-the-loop
escalation, and an audit trail — built as a **reusable core** rather than a
single-purpose script.

## Why it's built this way

The goal isn't just "call an LLM" — it's to design a reusable, secure,
observable agentic architecture that can be configured for different domains.
So instead of one monolithic script, this is split into layers:

| Capability | Where it lives |
|---|---|
| Agentic AI / tool-calling workflows | `backend/agent/orchestrator.py` — the Claude tool-use loop |
| Graph-based applications, knowledge graphs | `backend/agent/graph_store.py` (NetworkX; swappable for Neo4j/Neptune) |
| GraphRAG, vector search | `backend/agent/vector_store.py` + `graph_rag.py` — fuses semantic note search with graph traversal |
| MCP tools / APIs | `backend/agent/tools.py` — tool schemas written in the same shape as MCP tool definitions |
| Auth, permissions, RBAC | `backend/agent/auth.py` |
| Agent memory | `AgentMemory` in `orchestrator.py` |
| Observability / auditing / evaluation | `backend/agent/audit.py` — every tool call is logged with actor, args, and result |
| Human-in-the-loop | `request_human_review` tool — the agent is instructed to escalate rather than act autonomously below a confidence threshold |
| Productization / reusable library | Tool contracts, graph store, and RAG layer are domain-agnostic; only `sample_data.json` and the system prompt are fraud-specific |
| CI/CD, automated testing | `.github/workflows/ci.yml`, `backend/tests/` |
| Multi-tenant / hybrid deployment | `docker/Dockerfile`; stateless API process, swappable storage backends |

## Running it

```bash
pip install -r requirements.txt
uvicorn backend.api.main:app --reload --port 8000
```

Then open `frontend/index.html` in a browser (edit the `API` constant at the
top of the `<script>` if you're not on port 8000/8123).

**No API key required to try it.** If `ANTHROPIC_API_KEY` isn't set, the agent
runs in a deterministic **mock mode** that exercises the exact same
`ToolExecutor` → RBAC → audit path as live mode, just with a scripted plan
instead of Claude deciding the plan. Set `ANTHROPIC_API_KEY` to switch to the
real tool-use loop against Claude.

Try asking: *"Why are Shelby Holdings and Northgate Trading connected?"* — it
will pull the relevant analyst notes, expand the graph around the accounts
they mention, detect the shared device/IP fraud-ring signal, and escalate to
a human reviewer instead of taking action itself.

## Testing

```bash
pytest backend/tests -v
```

Covers graph traversal correctness, GraphRAG note-to-subgraph linking, RBAC
enforcement per role, and the audit log recording every tool call.

## What's intentionally simplified for a demo

- `GraphStore` is in-memory NetworkX, not Neo4j/Neptune — the traversal API is
  the same shape as a real graph DB call so it's a drop-in swap.
- `VectorStore` is TF-IDF, not a real embedding model — same reasoning.
- Auth is a hardcoded demo user map instead of OIDC/JWT.
- The UI is a single static HTML file rather than a full frontend build.

None of these simplifications change the architecture: the agent/tool/RBAC/audit
contracts stay the same when you swap these out for production infrastructure.
