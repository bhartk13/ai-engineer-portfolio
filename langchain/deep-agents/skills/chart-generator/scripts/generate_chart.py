#!/usr/bin/env python3
"""Generate a chart PNG from a workspace CSV file."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path


def _parse_dates(series):
    import pandas as pd

    parsed = pd.to_datetime(series, errors="coerce")
    if parsed.notna().sum() >= max(1, len(series) // 2):
        return parsed
    return series


def _save_figure(fig, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fig.tight_layout()
    fig.savefig(output_path, dpi=200, bbox_inches="tight")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate chart from CSV")
    parser.add_argument("--csv", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--chart-type", default="line", choices=("line", "bar", "scatter", "dual_line"))
    parser.add_argument("--x-column", default="")
    parser.add_argument("--y-column", default="")
    parser.add_argument("--y-column-2", default="")
    parser.add_argument("--group-by", default="")
    parser.add_argument("--title", default="Chart")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    output_path = Path(args.output)
    if not csv_path.is_file():
        print(json.dumps({"error": f"CSV not found: {csv_path}"}))
        return 1

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import pandas as pd

    df = pd.read_csv(csv_path)
    if df.empty:
        print(json.dumps({"error": "CSV is empty"}))
        return 1

    numeric = df.select_dtypes(include="number").columns.tolist()
    non_numeric = [c for c in df.columns if c not in numeric]

    x_col = args.x_column or (non_numeric[0] if non_numeric else df.columns[0])
    y_col = args.y_column or (numeric[0] if numeric else df.columns[-1])
    y_col_2 = args.y_column_2 or (numeric[1] if len(numeric) > 1 else "")
    group_by = args.group_by

    if args.chart_type == "dual_line" and not y_col_2:
        print(json.dumps({"error": "dual_line requires y_column and y_column_2"}))
        return 1

    x_data = _parse_dates(df[x_col]) if x_col in df.columns else df.iloc[:, 0]

    def plot_line(ax, y_name: str, marker: str) -> None:
        if group_by and group_by in df.columns:
            for label in sorted(df[group_by].astype(str).unique()):
                subset = df[df[group_by].astype(str) == label].copy()
                subset[x_col] = _parse_dates(subset[x_col])
                subset = subset.sort_values(x_col)
                ax.plot(subset[x_col], subset[y_name], marker=marker, label=label, linewidth=2)
            ax.legend()
        else:
            plot_df = df.copy()
            plot_df[x_col] = _parse_dates(plot_df[x_col])
            plot_df = plot_df.sort_values(x_col)
            ax.plot(plot_df[x_col], plot_df[y_name], marker=marker, linewidth=2)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_name)
        ax.grid(True, alpha=0.3)

    fig = None
    if args.chart_type == "dual_line":
        fig, axes = plt.subplots(1, 2, figsize=(12, 4))
        fig.suptitle(args.title, fontsize=14, fontweight="bold")
        plot_line(axes[0], y_col, "o")
        axes[0].set_title(y_col.replace("_", " ").title())
        plot_line(axes[1], y_col_2, "s")
        axes[1].set_title(y_col_2.replace("_", " ").title())
    elif args.chart_type == "bar":
        fig, ax = plt.subplots(figsize=(8, 4))
        fig.suptitle(args.title, fontsize=14, fontweight="bold")
        if group_by and group_by in df.columns:
            pivot = df.groupby([x_col, group_by])[y_col].sum().unstack(fill_value=0)
            pivot.plot(kind="bar", ax=ax)
        else:
            counts = df.groupby(x_col)[y_col].sum()
            counts.plot(kind="bar", ax=ax)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        ax.grid(True, axis="y", alpha=0.3)
    elif args.chart_type == "scatter":
        fig, ax = plt.subplots(figsize=(8, 4))
        fig.suptitle(args.title, fontsize=14, fontweight="bold")
        ax.scatter(df[x_col], df[y_col], alpha=0.7)
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        ax.grid(True, alpha=0.3)
    else:
        fig, ax = plt.subplots(figsize=(8, 4))
        fig.suptitle(args.title, fontsize=14, fontweight="bold")
        plot_line(ax, y_col, "o")

    _save_figure(fig, output_path)
    plt.close(fig)

    rel = output_path.name
    print(
        json.dumps(
            {
                "status": "ok",
                "output": str(output_path),
                "chart_type": args.chart_type,
                "x_column": x_col,
                "y_column": y_col,
                "y_column_2": y_col_2 or None,
                "group_by": group_by or None,
                "title": args.title,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
