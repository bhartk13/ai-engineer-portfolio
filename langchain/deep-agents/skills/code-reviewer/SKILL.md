---
name: code-reviewer
description: >
  Reviews code for bugs, security issues, performance, and maintainability.
  Use when the user asks for a code review, PR feedback, security audit, or quality
  assessment of existing code. Do NOT use for writing new features from scratch or
  debugging runtime production incidents.
license: MIT
allowed-tools: Read Write
---

# Code Review Skill

## Overview

Produce actionable, structured reviews of source files in the repository or workspace.

## Instructions

1. Use `read_file` to load the target file(s).
2. Evaluate:
   - Correctness and edge cases
   - Security (injection, secrets, unsafe defaults)
   - Performance and complexity
   - Readability and naming
3. Format the review as markdown with sections:
   - Summary (1 paragraph)
   - Critical issues (must fix)
   - Suggestions (should consider)
   - Positive observations
4. Save to `./workspace/review_<filename>.md`.

## Example

**Input:** "Review agent.py for production readiness"

**Output:** `workspace/review_agent.py.md` with prioritized findings.
