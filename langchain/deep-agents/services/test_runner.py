"""Run sandboxed tests against workspace Python files."""

from __future__ import annotations

import json
import os
import re

from config import SKILLS_ROOT, WORKSPACE_ROOT
from services.sandbox_runner import PROJECT_ROOT, PYTHON, resolve_workspace_path, run_in_workspace

TEST_SCRIPT = os.path.join(PROJECT_ROOT, SKILLS_ROOT, "test-runner", "scripts", "run_tests.py")


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "target"


def run_workspace_tests(target: str, mode: str = "auto") -> str:
    """Run pytest or a smoke test on a workspace Python file or directory.

    Writes a markdown report to /workspace/test_report_<name>.md.

    Args:
        target: Workspace path (e.g. /workspace/check_weather.py or /workspace/tests).
        mode: One of auto, pytest, or smoke.
    """
    if mode not in {"auto", "pytest", "smoke"}:
        return "mode must be one of: auto, pytest, smoke"

    try:
        target_full, target_rel = resolve_workspace_path(target)
    except ValueError as exc:
        return str(exc)

    if not os.path.exists(target_full):
        return f"Target not found: {target}"

    if not os.path.isfile(TEST_SCRIPT):
        return f"Test runner script missing: {TEST_SCRIPT}"

    slug = _slugify(os.path.splitext(os.path.basename(target_rel))[0])
    report_full = os.path.join(WORKSPACE_ROOT, f"test_report_{slug}.md")

    result = run_in_workspace(
        [
            PYTHON,
            TEST_SCRIPT,
            "--target",
            target_full,
            "--report",
            report_full,
            "--mode",
            mode,
        ]
    )

    rel_report = os.path.relpath(report_full, WORKSPACE_ROOT)

    if not result.stdout.strip():
        return (
            f"Test run failed.\n"
            f"Report: /workspace/{rel_report}\n"
            f"stderr:\n{result.stderr}"
        )

    try:
        payload = json.loads(result.stdout.strip().splitlines()[-1])
    except (json.JSONDecodeError, IndexError):
        payload = {"status": "fail", "report": report_full}

    status = payload.get("status", "fail")
    test_mode = payload.get("mode", mode)
    outcome = "passed" if status == "ok" else "failed"

    return (
        f"Tests {outcome} (mode: {test_mode}).\n"
        f"Report: /workspace/{rel_report}\n"
        f"stdout tail:\n{result.stdout[-1500:]}\n"
        f"stderr tail:\n{result.stderr[-800:]}"
    )
