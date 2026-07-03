#!/usr/bin/env python3
"""Run pytest or a smoke test against a workspace Python target."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description="Workspace test runner helper")
    parser.add_argument("--target", required=True, help="Absolute path to file or directory")
    parser.add_argument("--report", required=True, help="Absolute path for markdown report")
    parser.add_argument(
        "--mode",
        choices=("auto", "pytest", "smoke"),
        default="auto",
        help="Test mode",
    )
    args = parser.parse_args()

    target = Path(args.target)
    report = Path(args.report)
    report.parent.mkdir(parents=True, exist_ok=True)

    lines = [
        "# Test Report",
        "",
        f"_Generated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}_",
        f"_Target: `{target.name}`_",
        "",
    ]

    if not target.exists():
        report.write_text("\n".join(lines + ["## Result", "", "Target not found."]) + "\n")
        print(json.dumps({"status": "error", "report": str(report), "reason": "not_found"}))
        return 1

    mode = args.mode
    if mode == "auto":
        if target.is_dir() or target.name.startswith("test_"):
            mode = "pytest"
        else:
            mode = "smoke"

    import subprocess
    import sys

    if mode == "pytest":
        cmd = [sys.executable, "-m", "pytest", str(target), "-q", "--tb=short"]
        timeout = 120
        lines.extend(["## Mode", "", "pytest", ""])
    else:
        cmd = [sys.executable, str(target)]
        timeout = 15
        lines.extend(["## Mode", "", "smoke (python execution, 15s timeout)", ""])

    try:
        completed = subprocess.run(
            cmd, capture_output=True, text=True, cwd=target.parent, timeout=timeout
        )
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout.decode() if isinstance(exc.stdout, bytes) else (exc.stdout or "")
        stderr = exc.stderr.decode() if isinstance(exc.stderr, bytes) else (exc.stderr or "")
        report.write_text(
            "\n".join(
                lines
                + [
                    "## Result",
                    "",
                    "FAIL (timeout)",
                    "",
                    "## stdout",
                    "",
                    "```",
                    (stdout or "(empty)").strip(),
                    "```",
                    "",
                    "## stderr",
                    "",
                    "```",
                    (stderr or "(empty)").strip(),
                    "```",
                    "",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        print(json.dumps({"status": "fail", "report": str(report), "mode": mode, "reason": "timeout"}))
        return 1

    ok = completed.returncode == 0
    lines.extend(
        [
            "## Result",
            "",
            "PASS" if ok else "FAIL",
            "",
            "## stdout",
            "",
            "```",
            (completed.stdout or "(empty)").strip(),
            "```",
            "",
            "## stderr",
            "",
            "```",
            (completed.stderr or "(empty)").strip(),
            "```",
            "",
        ]
    )
    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"status": "ok" if ok else "fail", "report": str(report), "mode": mode}))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
