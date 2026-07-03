"""Generate chart PNGs from workspace CSV files via sandboxed matplotlib."""

from __future__ import annotations

import json
import os
import re

from config import SKILLS_ROOT, WORKSPACE_ROOT
from services.sandbox_runner import PROJECT_ROOT, PYTHON, resolve_workspace_path, run_in_workspace

CHART_SCRIPT = os.path.join(PROJECT_ROOT, SKILLS_ROOT, "chart-generator", "scripts", "generate_chart.py")


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "chart"


def generate_chart(
    csv_file: str,
    chart_type: str = "line",
    x_column: str = "",
    y_column: str = "",
    group_by: str = "",
    y_column_2: str = "",
    title: str = "",
    output_file: str = "",
) -> str:
    """Generate a chart PNG from a workspace CSV file.

    Use for visualization requests (plot, chart, graph) — not full statistical reports.
    Saves to /workspace/charts/<name>.png unless output_file is set.

    Args:
        csv_file: Workspace CSV path (e.g. /workspace/sample_sales.csv).
        chart_type: line, bar, scatter, or dual_line (two side-by-side line charts).
        x_column: X axis column (auto-detected if empty).
        y_column: Y axis column (auto-detected if empty).
        group_by: Column to split series (e.g. product).
        y_column_2: Second Y column for dual_line (e.g. units when y_column is revenue).
        title: Chart title.
        output_file: Optional output path (e.g. /workspace/charts/sales.png).
    """
    allowed = {"line", "bar", "scatter", "dual_line"}
    if chart_type not in allowed:
        return f"chart_type must be one of: {', '.join(sorted(allowed))}"

    try:
        csv_full, csv_rel = resolve_workspace_path(csv_file)
    except ValueError as exc:
        return str(exc)

    if not os.path.isfile(csv_full):
        return f"CSV file not found: {csv_file}"

    slug = _slugify(os.path.splitext(os.path.basename(csv_rel))[0])
    if output_file:
        try:
            output_full, output_rel = resolve_workspace_path(output_file)
        except ValueError as exc:
            return str(exc)
    else:
        output_rel = f"charts/{slug}_{chart_type}.png"
        output_full = os.path.join(WORKSPACE_ROOT, output_rel)

    os.makedirs(os.path.dirname(output_full), exist_ok=True)

    if not title:
        title = f"{slug.replace('-', ' ').title()} — {chart_type.replace('_', ' ').title()}"

    if not os.path.isfile(CHART_SCRIPT):
        return f"Chart script missing: {CHART_SCRIPT}"

    result = run_in_workspace(
        [
            PYTHON,
            CHART_SCRIPT,
            "--csv",
            csv_full,
            "--output",
            output_full,
            "--chart-type",
            chart_type,
            "--x-column",
            x_column,
            "--y-column",
            y_column,
            "--y-column-2",
            y_column_2,
            "--group-by",
            group_by,
            "--title",
            title,
        ]
    )

    if not result.ok:
        return (
            "Chart generation failed.\n"
            f"Command: {' '.join(result.command)}\n"
            f"stdout:\n{result.stdout}\n"
            f"stderr:\n{result.stderr}"
        )

    try:
        payload = json.loads(result.stdout.strip().splitlines()[-1])
    except (json.JSONDecodeError, IndexError):
        return f"Chart finished but output was unexpected:\n{result.stdout}"

    return (
        f"Chart saved.\n"
        f"Path: /workspace/{output_rel}\n"
        f"Type: {payload.get('chart_type')} | X: {payload.get('x_column')} | "
        f"Y: {payload.get('y_column')}"
        + (f" | Y2: {payload.get('y_column_2')}" if payload.get("y_column_2") else "")
        + (f" | Group: {payload.get('group_by')}" if payload.get("group_by") else "")
    )
