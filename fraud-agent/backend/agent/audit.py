"""
audit.py
--------
Structured, append-only audit trail of every agent action: which tool ran,
who triggered it, what arguments were used, and what came back. This is the
"observability, auditing, evaluation, monitoring" requirement — in production
this would ship to something like OpenTelemetry / Datadog / a SIEM instead of
an in-memory list, but every tool call in tools.py already emits through this
one choke point, so swapping the sink is a one-line change.
"""
from __future__ import annotations
import time
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any


@dataclass
class AuditEvent:
    event_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: float = field(default_factory=time.time)
    actor: str = ""
    action: str = ""
    arguments: dict[str, Any] = field(default_factory=dict)
    result_summary: str = ""
    case_id: str | None = None


class AuditLog:
    def __init__(self) -> None:
        self._events: list[AuditEvent] = []

    def record(self, actor: str, action: str, arguments: dict[str, Any],
               result_summary: str, case_id: str | None = None) -> AuditEvent:
        event = AuditEvent(actor=actor, action=action, arguments=arguments,
                            result_summary=result_summary, case_id=case_id)
        self._events.append(event)
        return event

    def all(self) -> list[dict[str, Any]]:
        return [asdict(e) for e in self._events]

    def for_case(self, case_id: str) -> list[dict[str, Any]]:
        return [asdict(e) for e in self._events if e.case_id == case_id]
