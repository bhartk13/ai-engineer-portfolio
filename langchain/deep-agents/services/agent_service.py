"""Agent streaming service — yields structured events for the UI."""

from __future__ import annotations

import json
import os
import re
import time
import traceback
from collections.abc import Generator
from typing import Any

from agent import get_active_model_spec, get_deep_agent
from services.llm_failover import get_failover_chain
from services.run_history import (
    append_activity,
    create_run,
    finalize_run,
    snapshot_workspace,
)

_agent = None
_failover_index = 0
MAX_RATE_LIMIT_RETRIES = int(os.getenv("RATE_LIMIT_MAX_RETRIES", "2"))
LLM_FAILOVER_ENABLED = os.getenv("LLM_FAILOVER", "true").lower() in {
    "1",
    "true",
    "yes",
}

RECORDABLE_TYPES = {
    "thought",
    "tool",
    "delegation",
    "skill_load",
    "plan",
    "error",
    "deploy",
}


def get_agent():
    global _agent
    if _agent is None:
        _agent = get_deep_agent(_failover_index)
    return _agent


def reset_agent() -> None:
    global _agent
    _agent = None


def get_failover_index() -> int:
    return _failover_index


def advance_failover_model() -> str | None:
    """Switch to the next model in the failover chain. Returns new model label or None."""
    global _failover_index, _agent
    if not LLM_FAILOVER_ENABLED:
        return None

    chain = get_failover_chain()
    if _failover_index + 1 >= len(chain):
        return None

    _failover_index += 1
    _agent = None
    return get_active_model_spec(_failover_index).label()


def reset_failover_state() -> None:
    """Reset to primary model at the start of each chat run."""
    global _failover_index, _agent
    _failover_index = 0
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


def _extract_deploy_url(text: str) -> str | None:
    match = re.search(r"https://[^\s\]>\"']+\.netlify\.app/?", text)
    if match:
        return match.group(0).rstrip(".,)")
    match = re.search(r"Live URL:\s*(https://\S+)", text)
    if match:
        return match.group(1).rstrip(".,)")
    return None


def _message_kind(msg) -> str | None:
    kind = getattr(msg, "type", None) or getattr(msg, "role", None)
    return str(kind) if kind else None


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


def _is_insufficient_quota_error(exc: Exception) -> bool:
    """OpenAI account has no billing credits left (not TPM rate limit)."""
    message = str(exc).lower()
    return "insufficient_quota" in message or (
        "exceeded your current quota" in message
        and "rate_limit" not in message
        and "tokens per min" not in message
    )


def _is_rate_limit_error(exc: Exception) -> bool:
    if _is_insufficient_quota_error(exc):
        return False
    message = str(exc).lower()
    return (
        "429" in message
        or "rate limit" in message
        or "rate_limit" in message
        or "rate_limit_exceeded" in message
        or "resource_exhausted" in message
        or "quota exceeded" in message
    )


def _is_model_unavailable_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "404" in message
        or "not_found_error" in message
        or "model not found" in message
        or "does not exist" in message
        or "invalid model" in message
    )


def _should_failover(exc: Exception) -> bool:
    return (
        _is_rate_limit_error(exc)
        or _is_insufficient_quota_error(exc)
        or _is_model_unavailable_error(exc)
    )


def _retry_after_seconds(exc: Exception) -> float:
    match = re.search(r"try again in (\d+(?:\.\d+)?)\s*s", str(exc), re.IGNORECASE)
    if match:
        return float(match.group(1)) + 0.5
    return 5.0


def _format_user_error(exc: Exception) -> str:
    message = str(exc)
    if _is_model_unavailable_error(exc):
        return (
            "**Model not available** with your API key.\n\n"
            "The failover chain tried an invalid or unsupported model id. "
            "Update `ANTHROPIC_MODEL` in `.env` or remove it to use auto-discovery "
            "(the app lists models from your Anthropic account at runtime). "
            "then restart the server.\n\n"
            f"Details: {message}"
        )
    if _is_insufficient_quota_error(exc):
        chain = get_failover_chain()
        failover_hint = ""
        if LLM_FAILOVER_ENABLED and len(chain) > 1:
            failover_hint = (
                "\n\n**Failover:** the app should switch to Anthropic automatically. "
                "If you still see this, set `LLM_PROVIDER=anthropic` in `.env` to skip "
                "OpenAI entirely, then restart the server."
            )
        return (
            "**OpenAI billing quota exhausted** — this is not a rate limit.\n\n"
            "Your OpenAI account has no remaining credits. You already use "
            "`gpt-4o-mini`; changing `OPENAI_MODEL` will not fix this.\n\n"
            "**Fix:** add credits at [platform.openai.com/billing](https://platform.openai.com/billing), "
            "or use Anthropic as primary (`LLM_PROVIDER=anthropic` in `.env`)."
            f"{failover_hint}\n\n"
            f"Details: {message}"
        )
    if _is_rate_limit_error(exc):
        chain = get_failover_chain()
        failover_hint = ""
        if LLM_FAILOVER_ENABLED and len(chain) > 1:
            failover_hint = (
                "\n\n**Failover:** the app already tries alternate models on 429. "
                "Add `GOOGLE_API_KEY` (free Gemini tier at ai.google.dev) for an extra "
                "fallback, or set `LLM_FAILOVER_MODELS` in `.env`."
            )
        return (
            "**Rate limit reached** on all configured models (tokens per minute).\n\n"
            "Deep agents make many LLM calls (planning, tools, subagents).\n\n"
            "**Tips:** use `OPENAI_MODEL=gpt-4o-mini`, add `GOOGLE_API_KEY` for Gemini "
            "failover, wait ~60s, then retry."
            f"{failover_hint}\n\n"
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


def _run_agent_stream(prompt: str, emit, config: dict[str, Any]):
    """Run one agent stream pass. Returns the final assistant text."""
    agent = get_agent()
    final_response = ""

    for event in agent.stream(
        {"messages": [("user", prompt)]},
        config=config,
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
                tool_name = getattr(msg, "name", None)

                if _message_kind(msg) == "tool" and tool_name == "deploy_static_site" and content:
                    url = _extract_deploy_url(content)
                    yield emit(
                        {
                            "type": "deploy",
                            "url": url,
                            "status": "live" if url else "built",
                            "message": content,
                        }
                    )

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


def stream_agent_events(
    prompt: str,
    thread_id: str | None = None,
) -> Generator[str, None, None]:
    """Yield Server-Sent Events (JSON payloads) while the agent runs."""
    from uuid import uuid4

    thread_id = thread_id or uuid4().hex[:16]
    reset_failover_state()
    run = create_run(prompt)
    run_id = run["id"]
    workspace_before = snapshot_workspace()
    started_mono = time.time()
    agent_config = {"configurable": {"thread_id": thread_id}}

    def emit(payload: dict[str, Any]) -> str:
        return f"data: {json.dumps(payload, default=str)}\n\n"

    yield emit(
        {
            "type": "run_start",
            "run_id": run_id,
            "thread_id": thread_id,
            "prompt": prompt,
            "model": get_active_model_spec(_failover_index).label(),
        }
    )

    last_exc: Exception | None = None
    final_response = ""
    status = "completed"
    wait_retries = 0

    while True:
        try:
            stream = _run_agent_stream(prompt, emit, agent_config)
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
            if _should_failover(exc):
                next_model = advance_failover_model()
                if next_model:
                    if _is_model_unavailable_error(exc):
                        reason = "Model not found"
                    elif _is_insufficient_quota_error(exc):
                        reason = "OpenAI quota exhausted"
                    else:
                        reason = "Rate limit"
                    switch_payload = {
                        "type": "thought",
                        "content": (
                            f"{reason} on previous model — failing over to **{next_model}**..."
                        ),
                    }
                    _record_event(run_id, switch_payload)
                    yield emit(switch_payload)
                    wait_retries = 0
                    continue

                if wait_retries < MAX_RATE_LIMIT_RETRIES and _is_rate_limit_error(exc):
                    wait = _retry_after_seconds(exc)
                    retry_payload = {
                        "type": "thought",
                        "content": (
                            f"Rate limit hit — waiting {wait:.0f}s before retry "
                            f"({wait_retries + 1}/{MAX_RATE_LIMIT_RETRIES})..."
                        ),
                    }
                    _record_event(run_id, retry_payload)
                    yield emit(retry_payload)
                    time.sleep(wait)
                    wait_retries += 1
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
