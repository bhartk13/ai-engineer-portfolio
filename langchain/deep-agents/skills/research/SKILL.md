---
name: research
description: >
  Conducts comprehensive web research on any topic using search APIs and synthesis.
  Use when the user asks for research, information gathering, competitive analysis,
  market scans, or current data from the web. Do NOT use for writing final polished
  prose or code review.
license: MIT
compatibility: Requires internet access and TAVILY_API_KEY
allowed-tools: internet_search Read Write
---

# Web Research Skill

## Overview

Structured web research: decompose questions, search iteratively, synthesize findings
with **inline citations**, and persist concise notes for other agents.

## Instructions

1. Parse the query into 2–4 focused sub-questions.
2. Run `internet_search` for each sub-question; refine queries if results are thin.
3. Cross-check facts across multiple results when possible.
4. **Cite every major claim** inline as `[Source Title](url)` — load
   `skills/research/references/citation-format.md` for format rules.
5. Write a structured markdown report with:
   - Executive summary (3–5 bullets, each with at least one citation)
   - Key findings by theme (max **8 themes**, max **5 bullets per theme**)
   - Sources table at the bottom
6. **Length cap:** keep the main report under **~250 lines**. If more detail is needed,
   save overflow to `/workspace/research_<topic>_detail.md` and link to it from the main file.
   Load `skills/research/references/length-limits.md` before writing long reports.
7. Save main report to `/workspace/research_<short_topic>.md`.

## Handoff

Tell the orchestrator the exact filepath. If the writer skill reads a long research file,
summarize first or point them to the executive summary section only.

## Example

**Input:** "Research multi-agent orchestration trends in 2026"

**Output:** `workspace/research_multi_agent_2026.md` with cited findings (≤250 lines).
