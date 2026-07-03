---
name: chart-generator
description: >
  Generates chart PNGs from workspace CSV files (line, bar, scatter, dual-line).
  Use when the user asks to plot, chart, graph, or visualize data — without needing
  a full analysis report. Do NOT use for statistical summaries (use data-analyst) or
  for writing matplotlib scripts by hand (use this skill's generate_chart tool).
license: MIT
compatibility: Requires pandas and matplotlib
allowed-tools: generate_chart Read
---

# Chart Generator Skill

## Overview

Create presentation-ready charts from CSV data using the **`generate_chart` tool**.
Do **not** write new matplotlib scripts in `/workspace/` unless the tool cannot
express the chart (rare).

## When to use vs data-analyst

| User intent | Skill |
|-------------|-------|
| "Plot revenue by month" / "make a chart" | **chart-generator** |
| "Analyze this CSV" / "summarize trends + stats" | **data-analyst** |
| Both chart + executive report | **data-analyst** first, or chart then writer |

## Instructions

1. Confirm the CSV exists (e.g. `/workspace/sample_sales.csv`).
2. Load `skills/chart-generator/references/chart-types.md` for column hints.
3. Call `generate_chart` with appropriate columns:

```text
generate_chart(
  csv_file="/workspace/sample_sales.csv",
  chart_type="dual_line",
  x_column="month",
  y_column="revenue",
  y_column_2="units",
  group_by="product",
  title="Sales Performance",
  output_file="/workspace/charts/sales_performance.png"
)
```

4. Return the saved PNG path to the user.

## Chart types

| chart_type | Use for |
|------------|---------|
| `line` | Trends over time |
| `dual_line` | Two metrics side-by-side (e.g. revenue + units) |
| `bar` | Category comparisons |
| `scatter` | Correlation between two numeric columns |

## Anti-patterns

- Do **not** create `gen_chart.py`, `plot_*.py`, etc. when `generate_chart` works.
- Do **not** use `code-generator` for standard CSV charts.

## Example

**Input:** "Generate a sales chart from sample_sales.csv"

**Behavior:** `dual_line` with `group_by=product`, save to `/workspace/charts/sales_performance.png`.
