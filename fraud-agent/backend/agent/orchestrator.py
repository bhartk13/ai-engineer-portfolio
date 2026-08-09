"""
orchestrator.py
----------------
The agentic loop: send the conversation + tool schemas to Claude, execute
whatever tool calls come back through ToolExecutor (which enforces RBAC and
writes to the audit log), feed results back, and repeat until Claude returns
a final text answer or the step budget is exhausted.

Runs in two modes:
  - LIVE  (ANTHROPIC_API_KEY set): calls the real Anthropic Messages API.
  - MOCK  (no key): runs a deterministic scripted version of the same loop
    so the whole system is demoable/testable without credentials.
"""
from __future__ import annotations
import os
import json
from dataclasses import dataclass, field
from typing import Any

from .tools import TOOL_SCHEMAS, ToolExecutor
from .auth import User
from .audit import AuditLog

SYSTEM_PROMPT = """You are a fraud investigation copilot. You have tools to search case
notes, traverse the transaction graph, and flag or escalate cases. Always ground claims in
tool results, cite specific entity IDs, and use request_human_review instead of taking any
high-confidence irreversible action yourself. Prefer request_human_review whenever confidence
is below 0.8 or the evidence is ambiguous."""

MAX_STEPS = 6


@dataclass
class AgentMemory:
    """Short-term conversation memory. Swappable for a persistent store
    (Redis/Postgres) keyed by case_id for long-running investigations."""
    messages: list[dict[str, Any]] = field(default_factory=list)

    def add_user(self, text: str) -> None:
        self.messages.append({"role": "user", "content": text})

    def add_assistant(self, content: Any) -> None:
        self.messages.append({"role": "assistant", "content": content})

    def add_tool_result(self, tool_use_id: str, content: Any) -> None:
        self.messages.append({
            "role": "user",
            "content": [{"type": "tool_result", "tool_use_id": tool_use_id, "content": json.dumps(content)}],
        })


class FraudInvestigationAgent:
    def __init__(self, executor: ToolExecutor, memory: AgentMemory | None = None):
        self.executor = executor
        self.memory = memory or AgentMemory()
        self.live = bool(os.environ.get("ANTHROPIC_API_KEY"))
        self.trace: list[dict[str, Any]] = []  # step-by-step trace for the UI / observability

    def investigate(self, user_message: str) -> dict[str, Any]:
        self.memory.add_user(user_message)
        self.trace = []

        if self.live:
            return self._run_live()
        return self._run_mock(user_message)

    # -- live mode: real Anthropic API tool-use loop -----------------------
    def _run_live(self) -> dict[str, Any]:
        import anthropic
        client = anthropic.Anthropic()

        for step in range(MAX_STEPS):
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1500,
                system=SYSTEM_PROMPT,
                tools=TOOL_SCHEMAS,
                messages=self.memory.messages,
            )
            self.memory.add_assistant(response.content)

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                final_text = "".join(b.text for b in response.content if b.type == "text")
                return {"answer": final_text, "trace": self.trace}

            for block in tool_uses:
                result = self._execute_and_trace(block.name, block.input)
                self.memory.add_tool_result(block.id, result)

        return {"answer": "Step budget exhausted before reaching a conclusion.", "trace": self.trace}

    # -- mock mode: deterministic scripted loop, same tool contracts -------
    def _run_mock(self, user_message: str) -> dict[str, Any]:
        """Exercises the exact same ToolExecutor/audit/RBAC path as live mode,
        with a simple keyword-driven plan instead of an LLM deciding the plan.
        This keeps the whole system runnable/testable with zero API credentials."""
        plan: list[tuple[str, dict[str, Any]]] = [
            ("search_case_context", {"query": user_message, "hops": 1}),
        ]

        ctx = self._execute_and_trace(*plan[0])
        entity_ids = sorted({n["entity_id"] for n in ctx.get("matched_notes", [])})

        if len(entity_ids) >= 2:
            shared = self._execute_and_trace("find_shared_connections", {"entity_ids": entity_ids})
            shared_ids = shared.get("shared", [])
        else:
            shared_ids = []

        high_risk = self._execute_and_trace("list_high_risk_entities", {"threshold": 0.5})

        summary_lines = [f"Searched case notes + graph for: \"{user_message}\""]
        if ctx["matched_notes"]:
            top = ctx["matched_notes"][0]
            summary_lines.append(
                f"Most relevant note (entity {top['entity_id']}, score {top['score']}): {top['text']}"
            )
        if shared_ids:
            summary_lines.append(
                f"Shared connections across {entity_ids}: {shared_ids} — a common device/IP across "
                f"otherwise-unrelated entities is a strong fraud-ring signal."
            )
        risky = [e["id"] for e in high_risk.get("entities", [])]
        if risky:
            summary_lines.append(f"Currently flagged as high-risk in the graph: {risky}")

        escalation = None
        if shared_ids or len(risky) >= 2:
            target = entity_ids[0] if entity_ids else (risky[0] if risky else None)
            if target:
                escalation = self._execute_and_trace("request_human_review", {
                    "entity_id": target,
                    "summary": " ".join(summary_lines),
                    "recommended_action": "Freeze outbound transfers pending manual KYC review; confidence < 0.8 threshold for autonomous action.",
                })
                summary_lines.append(
                    "Escalated to a human investigator rather than taking action autonomously, "
                    "per policy for irreversible actions / sub-0.8 confidence."
                )

        return {
            "answer": "\n\n".join(summary_lines),
            "trace": self.trace,
            "mode": "mock",
        }

    def _execute_and_trace(self, tool_name: str, tool_input: dict[str, Any]) -> Any:
        result = self.executor.run(tool_name, tool_input)
        self.trace.append({"tool": tool_name, "input": tool_input, "output": result})
        return result
