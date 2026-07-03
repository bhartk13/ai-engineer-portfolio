---
name: writer
description: >
  Writes high-quality blog posts, reports, and technical guides from notes or research.
  Use when the user needs structured writing, a draft article, executive summary, or
  formatted markdown content. Do NOT use for raw web research or code security audits.
license: MIT
allowed-tools: Read Write
---

# Writer Skill

## Overview

Turn research artifacts or bullet notes into clear, audience-appropriate markdown content.

## Instructions

1. Read input files from `/workspace/` (research notes, outlines, user-provided paths).
   - If research file is long, read only the executive summary section first.
   - Load `skills/writer/references/source-grounding.md` for citation rules.
2. Define an outline: title, introduction, 2–4 body sections, conclusion.
3. Match tone to audience (technical blog, executive brief, tutorial).
4. Ground claims in provided sources — preserve `[Title](url)` citations from research.
5. Use GitHub Flavored Markdown (headings, lists, blockquotes where useful).
6. Optional: use `skills/writer/assets/blog-template.md` as a structural guide.
7. Save to `/workspace/draft_<short_topic>.md` (required — do not use `blogs/` or other dirs).

## Handoff

Reference source files in a "Sources" section at the bottom of the draft.

## Example

**Input:** "Write a 600-word blog post from workspace/research_multi_agent_2026.md"

**Output:** `workspace/draft_multi_agent_blog.md`
