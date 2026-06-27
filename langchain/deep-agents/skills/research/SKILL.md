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

Structured web research: decompose questions, search iteratively, synthesize findings,
and persist notes for other agents.

## Instructions

1. Parse the query into 2–4 focused sub-questions.
2. Run `internet_search` for each sub-question; refine queries if results are thin.
3. Cross-check facts across multiple results when possible.
4. Write a structured markdown report with:
   - Executive summary (3–5 bullets)
   - Key findings by theme
   - Sources / search queries used
5. Save to `/workspace/research_<short_topic>.md` using a descriptive slug.

## Handoff

Tell the orchestrator the exact filepath so the **writer** skill can read it.

## Example

**Input:** "Research multi-agent orchestration trends in 2026"

**Output:** `workspace/research_multi_agent_2026.md` with summarized findings.
