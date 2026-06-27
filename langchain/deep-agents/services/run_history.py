"""Persist orchestration runs for history and portfolio demos."""

from __future__ import annotations

import json
import os
import time
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from agent import WORKSPACE_ROOT
from services.project_data import list_workspace_files, read_workspace_file

RUNS_ROOT = os.getenv("RUNS_ROOT", "./runs")


def _ensure_runs_dir() -> None:
    os.makedirs(RUNS_ROOT, exist_ok=True)


def _run_dir(run_id: str) -> str:
    return os.path.join(RUNS_ROOT, run_id)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def snapshot_workspace() -> dict[str, float]:
    """Map workspace relative paths to last-modified timestamps."""
    snapshot: dict[str, float] = {}
    for rel_path in list_workspace_files():
        full_path = os.path.join(WORKSPACE_ROOT, rel_path)
        if os.path.isfile(full_path):
            snapshot[rel_path] = os.path.getmtime(full_path)
    return snapshot


def diff_workspace(
    before: dict[str, float], after: dict[str, float]
) -> dict[str, list[str]]:
    created = [path for path in after if path not in before]
    modified = [
        path
        for path in after
        if path in before and after[path] > before[path]
    ]
    return {"created": sorted(created), "modified": sorted(modified)}


def create_run(prompt: str) -> dict[str, Any]:
    _ensure_runs_dir()
    run_id = uuid4().hex[:12]
    started_at = _now_iso()
    run_path = _run_dir(run_id)
    os.makedirs(run_path, exist_ok=True)

    metadata = {
        "id": run_id,
        "prompt": prompt,
        "started_at": started_at,
        "ended_at": None,
        "status": "running",
        "duration_ms": None,
        "plan": [],
        "stats": {
            "skills_loaded": 0,
            "delegations": 0,
            "tool_calls": 0,
            "errors": 0,
        },
        "artifacts": {"created": [], "modified": []},
    }

    with open(os.path.join(run_path, "metadata.json"), "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    with open(os.path.join(run_path, "prompt.txt"), "w", encoding="utf-8") as handle:
        handle.write(prompt)

    open(os.path.join(run_path, "activity.jsonl"), "w", encoding="utf-8").close()

    return metadata


def append_activity(run_id: str, event: dict[str, Any]) -> None:
    run_path = _run_dir(run_id)
    if not os.path.isdir(run_path):
        return

    entry = {"timestamp": _now_iso(), **event}
    with open(os.path.join(run_path, "activity.jsonl"), "a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, default=str) + "\n")

    metadata_path = os.path.join(run_path, "metadata.json")
    if not os.path.exists(metadata_path):
        return

    with open(metadata_path, encoding="utf-8") as handle:
        metadata = json.load(handle)

    if event.get("type") == "plan":
        metadata["plan"] = event.get("todos", [])

    stats = metadata.setdefault(
        "stats",
        {"skills_loaded": 0, "delegations": 0, "tool_calls": 0, "errors": 0},
    )
    event_type = event.get("type")
    if event_type == "skill_load":
        stats["skills_loaded"] += 1
    elif event_type == "delegation":
        stats["delegations"] += 1
    elif event_type == "tool":
        stats["tool_calls"] += 1
    elif event_type == "error":
        stats["errors"] += 1

    with open(metadata_path, "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)


def finalize_run(
    run_id: str,
    *,
    response: str,
    workspace_before: dict[str, float],
    workspace_after: dict[str, float],
    status: str,
    started_mono: float,
) -> dict[str, Any]:
    run_path = _run_dir(run_id)
    metadata_path = os.path.join(run_path, "metadata.json")

    with open(metadata_path, encoding="utf-8") as handle:
        metadata = json.load(handle)

    ended_at = _now_iso()
    duration_ms = int((time.time() - started_mono) * 1000)
    artifacts = diff_workspace(workspace_before, workspace_after)

    metadata.update(
        {
            "ended_at": ended_at,
            "status": status,
            "duration_ms": duration_ms,
            "artifacts": artifacts,
        }
    )

    with open(metadata_path, "w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)

    with open(os.path.join(run_path, "response.md"), "w", encoding="utf-8") as handle:
        handle.write(response)

    with open(os.path.join(run_path, "artifacts.json"), "w", encoding="utf-8") as handle:
        json.dump(artifacts, handle, indent=2)

    return metadata


def list_runs(limit: int = 20) -> list[dict[str, Any]]:
    _ensure_runs_dir()
    runs: list[dict[str, Any]] = []

    for entry in os.listdir(RUNS_ROOT):
        metadata_path = os.path.join(RUNS_ROOT, entry, "metadata.json")
        if not os.path.isfile(metadata_path):
            continue
        with open(metadata_path, encoding="utf-8") as handle:
            runs.append(json.load(handle))

    runs.sort(key=lambda item: item.get("started_at", ""), reverse=True)
    return runs[:limit]


def get_run(run_id: str) -> dict[str, Any]:
    metadata_path = os.path.join(_run_dir(run_id), "metadata.json")
    if not os.path.isfile(metadata_path):
        raise FileNotFoundError(run_id)

    with open(metadata_path, encoding="utf-8") as handle:
        metadata = json.load(handle)

    activity_path = os.path.join(_run_dir(run_id), "activity.jsonl")
    activity: list[dict[str, Any]] = []
    if os.path.isfile(activity_path):
        with open(activity_path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    activity.append(json.loads(line))

    response = ""
    response_path = os.path.join(_run_dir(run_id), "response.md")
    if os.path.isfile(response_path):
        with open(response_path, encoding="utf-8") as handle:
            response = handle.read()

    return {
        "metadata": metadata,
        "activity": activity,
        "response": response,
    }


def load_run_artifact_content(run_id: str, rel_path: str) -> str:
    """Read a workspace artifact referenced by a completed run."""
    return read_workspace_file(rel_path)
