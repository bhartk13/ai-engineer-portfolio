---
name: data-analyst
description: >
  Analyzes CSV datasets in the workspace with pandas, statistics, and summary charts.
  Use when the user asks to analyze data, explore a CSV, compute summaries, or produce
  a data report with insights. Do NOT use for chart-only requests (use chart-generator)
  or web research / blog writing.
license: MIT
compatibility: Requires pandas and matplotlib (installed with project requirements)
allowed-tools: run_data_analysis Read Write
---

# Data Analyst Skill

## Overview

Turn workspace CSV files into an executive markdown report and PNG charts using a
sandboxed analysis script.

## Instructions

1. Confirm the CSV exists under `/workspace/` (e.g. `/workspace/sample_sales.csv`).
2. Load `skills/data-analyst/references/chart-types.md` if the user wants specific chart types.
3. Call `run_data_analysis(csv_file="/workspace/<file>.csv", topic="<short-slug>")`.
4. Read the generated report and summarize key findings for the user.
5. Do **not** hand-write duplicate analysis when the tool succeeds — use the tool output.

## Outputs

| Artifact | Path |
|----------|------|
| Analysis report | `/workspace/analysis_<topic>.md` |
| Charts | `/workspace/charts/*.png` |

## Handoff

Writers can cite the analysis report. Deploy skill can publish a summary draft if requested.

## Example

**Input:** "Analyze sample_sales.csv and summarize revenue trends"

**Behavior:** Load this skill → `run_data_analysis` → return insights + report path.
