"""Agent streaming service — yields structured events for the UI."""

from __future__ import annotations

import json
import os
import re
import time
import traceback
from collections.abc import Generator
from typing import Any

from agent import get_deep_agent
from services.run_history import (
    append_activity,
    create_run,
    finalize_run,
    snapshot_workspace,
)

_agent = None
MAX_RATE_LIMIT_RETRIES = int(os.getenv("RATE_LIMIT_MAX_RETRIES", "3"))

RECORDABLE_TYPES = {
    "thought",
    "tool",
    "delegation",
    "skill_load",
    "plan",
    "error",
}


def get_agent():
    global _agent
    if _agent is None:
        _agent = get_deep_agent()
    return _agent


def reset_agent() -> None:
    global _agent
    _agent = None


def normalize_messages(messages) -> list:
    if isinstance(messages, list):
        return messages
    if hasattr(messages, "value") and isinstance(messages.value, list):
        return messages.value
    return []


def normalize_content(content: Any) -> str:
    """Convert LangChain message content blocks to a plain string for the UI."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                text = block.get("text") or block.get("content")
                parts.append(str(text) if text is not None else str(block))
            else:
                parts.append(str(block))
        return "\n".join(part for part in parts if part)
    return str(content)


def parse_tool_call(tool_call: Any) -> tuple[str | None, dict[str, Any]]:
    if isinstance(tool_call, dict):
        name = tool_call.get("name")
        args = tool_call.get("args") or {}
    else:
        name = getattr(tool_call, "name", None)
        args = getattr(tool_call, "args", {}) or {}

    if not isinstance(args, dict):
        args = {"value": str(args)}
    return name, args


def _serialize_todos(todos: Any) -> list[str]:
    if not todos:
        return []
    result: list[str] = []
    for item in todos:
        if isinstance(item, dict):
            result.append(
                str(item.get("content") or item.get("task") or item.get("title") or item)
            )
        else:
            result.append(str(item))
    return result


def _is_rate_limit_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return "429" in message or "rate limit" in message or "rate_limit" in message


def _retry_after_seconds(exc: Exception) -> float:
    match = re.search(r"try again in (\d+(?:\.\d+)?)\s*s", str(exc), re.IGNORECASE)
    if match:
        return float(match.group(1)) + 0.5
    return 5.0


def _format_user_error(exc: Exception) -> str:
    message = str(exc)
    if _is_rate_limit_error(exc):
        return (
            "**OpenAI rate limit reached** (tokens per minute).\n\n"
            "Deep agents make many LLM calls (planning, tools, subagents), so they "
            "burn through TPM quickly on `gpt-4o`.\n\n"
            "**Fix:** set `OPENAI_MODEL=gpt-4o-mini` in `.env`, wait ~60 seconds, "
            "then restart the server.\n\n"
            f"Details: {message}"
        )
    return (
        "**Agent error**\n\n"
        f"{message}\n\n"
        "Verify API keys and model names in `.env`, then restart the server."
    )


def _parse_sse_payload(chunk: str) -> dict[str, Any] | None:
    if not chunk.startswith("data: "):
        return None
    try:
        return json.loads(chunk[6:].strip())
    except json.JSONDecodeError:
        return None


def _record_event(run_id: str | None, payload: dict[str, Any]) -> None:
    if not run_id:
        return
    event_type = payload.get("type")
    if event_type in RECORDABLE_TYPES:
        append_activity(run_id, payload)


def _run_agent_stream(prompt: str, emit):
    """Run one agent stream pass. Returns the final assistant text."""
    agent = get_agent()
    final_response = ""

    for event in agent.stream(
        {"messages": [("user", prompt)]},
        stream_mode="updates",
    ):
        for node_name, data in event.items():
            if not isinstance(data, dict):
                continue

            if "todos" in data:
                yield emit({"type": "plan", "todos": _serialize_todos(data["todos"])})

            if "messages" not in data:
                continue

            for msg in normalize_messages(data["messages"]):
                content = normalize_content(getattr(msg, "content", None))
                if content:
                    if node_name == "agent":
                        yield emit({"type": "thought", "content": content})
                    else:
                        final_response = content

                for tool_call in getattr(msg, "tool_calls", []) or []:
                    tool_name, tool_args = parse_tool_call(tool_call)

                    if tool_name == "task":
                        yield emit(
                            {
                                "type": "delegation",
                                "subagent": tool_args.get("subagent_type", "unknown"),
                                "description": str(tool_args.get("description", "")),
                            }
                        )
                    elif tool_name == "write_todos":
                        yield emit(
                            {
                                "type": "plan",
                                "todos": _serialize_todos(tool_args.get("todos", [])),
                            }
                        )
                    elif tool_name == "read_file" and "SKILL.md" in str(
                        tool_args.get("path", "")
                    ):
                        skill_name = os.path.basename(
                            os.path.dirname(str(tool_args["path"]))
                        )
                        yield emit({"type": "skill_load", "skill": skill_name})
                    else:
                        yield emit(
                            {
                                "type": "tool",
                                "name": tool_name or "unknown",
                                "args": tool_args,
                            }
                        )

    return final_response


def stream_agent_events(prompt: str) -> Generator[str, None, None]:
    """Yield Server-Sent Events (JSON payloads) while the agent runs."""
    run = create_run(prompt)
    run_id = run["id"]
    workspace_before = snapshot_workspace()
    started_mono = time.time()

    def emit(payload: dict[str, Any]) -> str:
        return f"data: {json.dumps(payload, default=str)}\n\n"

    yield emit({"type": "run_start", "run_id": run_id, "prompt": prompt})

    last_exc: Exception | None = None
    final_response = ""
    status = "completed"

    for attempt in range(MAX_RATE_LIMIT_RETRIES):
        try:
            stream = _run_agent_stream(prompt, emit)
            while True:
                try:
                    chunk = next(stream)
                    payload = _parse_sse_payload(chunk)
                    if payload:
                        _record_event(run_id, payload)
                    yield chunk
                except StopIteration as stop:
                    final_response = stop.value or ""
                    break

            message_payload = {
                "type": "message",
                "content": final_response or "Agent finished without a text response.",
            }
            _record_event(run_id, message_payload)
            yield emit(message_payload)
            break
        except Exception as exc:
            last_exc = exc
            if _is_rate_limit_error(exc) and attempt < MAX_RATE_LIMIT_RETRIES - 1:
                wait = _retry_after_seconds(exc)
                retry_payload = {
                    "type": "thought",
                    "content": (
                        f"Rate limit hit — waiting {wait:.0f}s before retry "
                        f"({attempt + 1}/{MAX_RATE_LIMIT_RETRIES})..."
                    ),
                }
                _record_event(run_id, retry_payload)
                yield emit(retry_payload)
                time.sleep(wait)
                continue
            status = "failed"
            break

    if last_exc:
        message = str(last_exc)
        error_payload = {"type": "error", "message": message, "trace": traceback.format_exc()}
        _record_event(run_id, error_payload)
        yield emit(error_payload)
        final_response = _format_user_error(last_exc)
        message_payload = {"type": "message", "content": final_response}
        _record_event(run_id, message_payload)
        yield emit(message_payload)

    workspace_after = snapshot_workspace()
    metadata = finalize_run(
        run_id,
        response=final_response,
        workspace_before=workspace_before,
        workspace_after=workspace_after,
        status=status,
        started_mono=started_mono,
    )

    yield emit(
        {
            "type": "run_complete",
            "run_id": run_id,
            "status": metadata["status"],
            "duration_ms": metadata["duration_ms"],
            "artifacts": metadata["artifacts"],
            "stats": metadata["stats"],
        }
    )
    yield emit({"type": "done"})
