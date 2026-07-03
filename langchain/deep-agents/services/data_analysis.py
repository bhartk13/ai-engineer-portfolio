"""Run sandboxed CSV analysis and write workspace artifacts."""

from __future__ import annotations

import json
import os
import re

from config import SKILLS_ROOT, WORKSPACE_ROOT
from services.sandbox_runner import PROJECT_ROOT, PYTHON, resolve_workspace_path, run_in_workspace

ANALYZE_SCRIPT = os.path.join(PROJECT_ROOT, SKILLS_ROOT, "data-analyst", "scripts", "analyze.py")


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "dataset"


def run_data_analysis(csv_file: str, topic: str = "dataset") -> str:
    """Analyze a CSV in the workspace and produce a markdown report with charts.

    Runs a sandboxed pandas/matplotlib script. Outputs:
    - /workspace/analysis_<topic>.md
    - /workspace/charts/*.png

    Args:
        csv_file: Workspace CSV path (e.g. /workspace/sample_sales.csv).
        topic: Short slug for output filenames (e.g. sales-q1).
    """
    try:
        csv_full, csv_rel = resolve_workspace_path(csv_file)
    except ValueError as exc:
        return str(exc)

    if not os.path.isfile(csv_full):
        return f"CSV file not found: {csv_file}"

    if not csv_full.lower().endswith(".csv"):
        return "run_data_analysis expects a .csv file."

    if not os.path.isfile(ANALYZE_SCRIPT):
        return f"Analysis script missing: {ANALYZE_SCRIPT}"

    slug = _slugify(topic)
    report_stem = os.path.join(WORKSPACE_ROOT, f"analysis_{slug}")
    os.makedirs(os.path.join(WORKSPACE_ROOT, "charts"), exist_ok=True)

    result = run_in_workspace(
        [
            PYTHON,
            ANALYZE_SCRIPT,
            "--csv",
            csv_full,
            "--output-prefix",
            report_stem,
            "--title",
            f"Analysis: {slug.replace('-', ' ').title()}",
        ]
    )

    if not result.ok:
        return (
            "Data analysis failed.\n"
            f"Command: {' '.join(result.command)}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )

    try:
        payload = json.loads(result.stdout.strip().splitlines()[-1])
    except (json.JSONDecodeError, IndexError):
        return f"Analysis finished but output was unexpected:\n{result.stdout}\n{result.stderr}"

    report_path = payload.get("report", f"{report_stem}.md")
    rel_report = os.path.relpath(report_path, WORKSPACE_ROOT)
    charts = payload.get("charts", [])
    rel_charts = [os.path.relpath(c, WORKSPACE_ROOT) for c in charts]

    return (
        f"Analysis complete.\n"
        f"Report: /workspace/{rel_report}\n"
        f"Rows: {payload.get('rows', '?')}, columns: {payload.get('columns', [])}\n"
        f"Charts: {', '.join('/workspace/' + c for c in rel_charts) or 'none'}"
    )
