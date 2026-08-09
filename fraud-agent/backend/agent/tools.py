"""
tools.py
--------
Defines the tool surface the agent can call, in Anthropic tool-use JSON
schema format. Each tool is a thin, permission-checked wrapper over
GraphStore / GraphRAG / a pending-review queue.

This module is written so it could be re-exposed as an MCP server directly:
each function's (name, description, input_schema) triple maps 1:1 onto an
MCP tool definition, which is the pattern the job spec calls out explicitly
("MCP tools", "reusable ... library of applications").
"""
from __future__ import annotations
from typing import Any, Callable
from .graph_store import GraphStore
from .graph_rag import GraphRAG
from .auth import User, Permission, require
from .audit import AuditLog

TOOL_SCHEMAS: list[dict[str, Any]] = [
    {
        "name": "search_case_context",
        "description": (
            "GraphRAG search: finds analyst notes semantically related to the query, "
            "then expands the graph neighborhood (accounts, devices, IPs, transfers) "
            "around every entity those notes mention. Use this first to orient on a case."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Natural language question or topic"},
                "hops": {"type": "integer", "description": "Graph hops to expand around matched entities", "default": 1},
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_entity_neighborhood",
        "description": "Return an entity and everything connected to it within N hops (accounts, devices, IPs, merchants, transfers).",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_id": {"type": "string"},
                "hops": {"type": "integer", "default": 1},
            },
            "required": ["entity_id"],
        },
    },
    {
        "name": "find_connection_path",
        "description": "Find the shortest path(s) connecting two entities through the transaction graph — useful for proving two accounts are linked.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_id": {"type": "string"},
                "target_id": {"type": "string"},
            },
            "required": ["source_id", "target_id"],
        },
    },
    {
        "name": "find_shared_connections",
        "description": "Given a list of entity IDs, return entities connected to ALL of them (e.g. a shared device/IP linking otherwise-unrelated accounts — a classic fraud-ring signal).",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_ids": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["entity_ids"],
        },
    },
    {
        "name": "list_high_risk_entities",
        "description": "List all entities at or above a risk_score threshold (0-1).",
        "input_schema": {
            "type": "object",
            "properties": {"threshold": {"type": "number", "default": 0.5}},
        },
    },
    {
        "name": "flag_case",
        "description": "Flag an entity as a confirmed suspicious-activity case with a reason. Requires flag_case permission.",
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_id": {"type": "string"},
                "reason": {"type": "string"},
                "confidence": {"type": "number", "description": "0-1 confidence"},
            },
            "required": ["entity_id", "reason", "confidence"],
        },
    },
    {
        "name": "request_human_review",
        "description": (
            "Escalate to a human investigator instead of taking an irreversible action. "
            "MUST be used before any account freeze, or whenever confidence is below 0.8, "
            "or the evidence is ambiguous."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "entity_id": {"type": "string"},
                "summary": {"type": "string"},
                "recommended_action": {"type": "string"},
            },
            "required": ["entity_id", "summary", "recommended_action"],
        },
    },
]


class ToolExecutor:
    """Binds tool schemas to real implementations, enforcing RBAC + audit on every call."""

    def __init__(self, graph_store: GraphStore, graph_rag: GraphRAG, audit_log: AuditLog, user: User):
        self.graph_store = graph_store
        self.graph_rag = graph_rag
        self.audit_log = audit_log
        self.user = user
        self.pending_reviews: list[dict[str, Any]] = []
        self.flagged_cases: list[dict[str, Any]] = []

        self._dispatch: dict[str, Callable[[dict[str, Any]], Any]] = {
            "search_case_context": self._search_case_context,
            "get_entity_neighborhood": self._get_entity_neighborhood,
            "find_connection_path": self._find_connection_path,
            "find_shared_connections": self._find_shared_connections,
            "list_high_risk_entities": self._list_high_risk_entities,
            "flag_case": self._flag_case,
            "request_human_review": self._request_human_review,
        }

    def run(self, tool_name: str, tool_input: dict[str, Any]) -> Any:
        if tool_name not in self._dispatch:
            raise ValueError(f"Unknown tool: {tool_name}")
        result = self._dispatch[tool_name](tool_input)
        self.audit_log.record(
            actor=self.user.user_id,
            action=tool_name,
            arguments=tool_input,
            result_summary=str(result)[:300],
            case_id=tool_input.get("entity_id"),
        )
        return result

    # -- tool implementations --------------------------------------------
    def _search_case_context(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.SEARCH)
        return self.graph_rag.retrieve(args["query"], hops=args.get("hops", 1))

    def _get_entity_neighborhood(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.READ_CASE)
        return self.graph_store.neighbors(args["entity_id"], hops=args.get("hops", 1))

    def _find_connection_path(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.READ_CASE)
        return {"paths": self.graph_store.find_paths(args["source_id"], args["target_id"])}

    def _find_shared_connections(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.READ_CASE)
        return {"shared": self.graph_store.shared_neighbors(args["entity_ids"])}

    def _list_high_risk_entities(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.READ_CASE)
        return {"entities": self.graph_store.high_risk_entities(args.get("threshold", 0.5))}

    def _flag_case(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.FLAG_CASE)
        case = {**args}
        self.flagged_cases.append(case)
        return {"status": "flagged", "case": case}

    def _request_human_review(self, args: dict[str, Any]) -> Any:
        require(self.user, Permission.ESCALATE_TO_HUMAN)
        review = {**args, "status": "pending"}
        self.pending_reviews.append(review)
        return {"status": "escalated_to_human", "review": review}
