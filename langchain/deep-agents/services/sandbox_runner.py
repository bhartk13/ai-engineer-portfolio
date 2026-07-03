"""Sandboxed subprocess execution confined to the workspace."""

from __future__ import annotations

import os
import subprocess
import sys
from dataclasses import dataclass

from config import WORKSPACE_ROOT

DEFAULT_TIMEOUT_SECONDS = int(os.getenv("SANDBOX_TIMEOUT_SECONDS", "60"))
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PYTHON = sys.executable


@dataclass
class SandboxResult:
    ok: bool
    returncode: int
    stdout: str
    stderr: str
    command: list[str]


def resolve_workspace_path(path: str) -> tuple[str, str]:
    """Return (absolute path, path relative to workspace root)."""
    normalized = path.strip().replace("\\", "/")
    for prefix in ("/workspace/", "./workspace/", "workspace/"):
        if normalized.startswith(prefix):
            normalized = normalized[len(prefix) :]
            break
    if normalized.startswith("/"):
        normalized = normalized.lstrip("/")

    full = os.path.normpath(os.path.join(WORKSPACE_ROOT, normalized))
    workspace_abs = os.path.abspath(WORKSPACE_ROOT)
    full = os.path.abspath(full)
    if not full.startswith(workspace_abs + os.sep) and full != workspace_abs:
        raise ValueError(f"Path must stay inside workspace: {path}")
    return full, normalized


def run_in_workspace(
    command: list[str],
    *,
    timeout_seconds: int | None = None,
) -> SandboxResult:
    """Run a command with cwd locked to the workspace directory."""
    timeout = timeout_seconds or DEFAULT_TIMEOUT_SECONDS
    workspace_abs = os.path.abspath(WORKSPACE_ROOT)
    os.makedirs(workspace_abs, exist_ok=True)

    env = os.environ.copy()
    env["PYTHONPATH"] = workspace_abs

    try:
        completed = subprocess.run(
            command,
            cwd=workspace_abs,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
        )
        return SandboxResult(
            ok=completed.returncode == 0,
            returncode=completed.returncode,
            stdout=completed.stdout or "",
            stderr=completed.stderr or "",
            command=command,
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        return SandboxResult(
            ok=False,
            returncode=-1,
            stdout=stdout,
            stderr=(stderr + f"\nTimed out after {timeout}s").strip(),
            command=command,
        )
