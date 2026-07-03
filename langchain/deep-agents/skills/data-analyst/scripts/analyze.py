#!/usr/bin/env python3
"""Analyze a CSV file and write a markdown report plus chart PNGs."""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path


def _slug(value: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in value.lower()).strip("_") or "data"


def main() -> int:
    parser = argparse.ArgumentParser(description="Workspace CSV analysis helper")
    parser.add_argument("--csv", required=True, help="Absolute path to CSV file")
    parser.add_argument(
        "--output-prefix",
        required=True,
        help="Absolute path prefix for outputs (without extension)",
    )
    parser.add_argument("--title", default="Data Analysis Report")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.is_file():
        print(json.dumps({"error": f"CSV not found: {csv_path}"}))
        return 1

    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import pandas as pd

    df = pd.read_csv(csv_path)
    prefix = Path(args.output_prefix)
    prefix.parent.mkdir(parents=True, exist_ok=True)
    charts_dir = prefix.parent / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)

    slug = _slug(prefix.stem.replace("analysis_", ""))
    chart_paths: list[str] = []
    insights: list[str] = []

    numeric = df.select_dtypes(include="number")
    categorical = df.select_dtypes(exclude="number")

    if not numeric.empty:
        col = numeric.columns[0]
        fig, ax = plt.subplots(figsize=(8, 4))
        numeric[col].dropna().hist(ax=ax, bins=min(20, max(5, len(df) // 5)))
        ax.set_title(f"Distribution of {col}")
        ax.set_xlabel(col)
        ax.set_ylabel("Count")
        chart_file = charts_dir / f"{slug}_{col}_hist.png"
        fig.tight_layout()
        fig.savefig(chart_file, dpi=120)
        plt.close(fig)
        chart_paths.append(str(chart_file))
        insights.append(
            f"**{col}**: mean={numeric[col].mean():.2f}, "
            f"min={numeric[col].min():.2f}, max={numeric[col].max():.2f}"
        )

    if len(numeric.columns) >= 2:
        x_col, y_col = numeric.columns[0], numeric.columns[1]
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.scatter(df[x_col], df[y_col], alpha=0.7)
        ax.set_title(f"{y_col} vs {x_col}")
        ax.set_xlabel(x_col)
        ax.set_ylabel(y_col)
        chart_file = charts_dir / f"{slug}_{x_col}_vs_{y_col}.png"
        fig.tight_layout()
        fig.savefig(chart_file, dpi=120)
        plt.close(fig)
        chart_paths.append(str(chart_file))

    if not categorical.empty:
        col = categorical.columns[0]
        counts = df[col].astype(str).value_counts().head(10)
        fig, ax = plt.subplots(figsize=(8, 4))
        counts.plot(kind="bar", ax=ax)
        ax.set_title(f"Top values for {col}")
        ax.set_xlabel(col)
        ax.set_ylabel("Count")
        fig.tight_layout()
        chart_file = charts_dir / f"{slug}_{col}_counts.png"
        fig.savefig(chart_file, dpi=120)
        plt.close(fig)
        chart_paths.append(str(chart_file))
        top = counts.index[0] if len(counts) else "n/a"
        insights.append(f"**{col}**: most common value is `{top}` ({counts.iloc[0]} rows)")

    report_path = prefix.with_suffix(".md")
    generated = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    lines = [
        f"# {args.title}",
        "",
        f"_Generated: {generated}_",
        f"_Source: `{csv_path.name}`_",
        "",
        "## Dataset overview",
        "",
        f"- Rows: **{len(df)}**",
        f"- Columns: **{len(df.columns)}** (`{', '.join(df.columns.astype(str))}`)",
        "",
        "## Key insights",
        "",
    ]
    if insights:
        lines.extend(f"- {item}" for item in insights)
    else:
        lines.append("- No numeric or categorical columns detected for automated charts.")

    if not numeric.empty:
        lines.extend(["", "## Numeric summary", ""])
        summary = numeric.describe().round(2)
        header = "| stat | " + " | ".join(summary.columns.astype(str)) + " |"
        sep = "| --- | " + " | ".join("---" for _ in summary.columns) + " |"
        rows = []
        for stat_name in summary.index:
            cells = " | ".join(str(summary.loc[stat_name, col]) for col in summary.columns)
            rows.append(f"| {stat_name} | {cells} |")
        lines.extend([header, sep, *rows])

    if chart_paths:
        lines.extend(["", "## Charts", ""])
        for chart in chart_paths:
            rel = Path(chart).name
            lines.append(f"![Chart](charts/{rel})")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "status": "ok",
                "report": str(report_path),
                "charts": chart_paths,
                "rows": len(df),
                "columns": list(df.columns.astype(str)),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
