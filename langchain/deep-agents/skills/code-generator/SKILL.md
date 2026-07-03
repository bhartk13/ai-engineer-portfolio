---
name: code-generator
description: >
  Writes new Python scripts and small utilities in the workspace from a user spec.
  Use when the user asks to generate, create, implement, or scaffold code (e.g. a
  weather script, CLI tool, helper module). Do NOT use for CSV charts (use chart-generator),
  reviewing existing code (use code-reviewer), or markdown/blog writing (use writer).
license: MIT
allowed-tools: Read Write
---

# Code Generator Skill

## Overview

Produce clean, single-purpose source files under `/workspace/`. One file, one coherent
implementation — no duplicated blocks.

## Instructions

1. **Read first** — If the target path may already exist, call `read_file` on it before
   writing or editing.
2. Load `skills/code-generator/references/python-checklist.md` before finishing.
3. **New file** — Use `write_file` once with the complete final content.
4. **Existing file** — Use `edit_file` with a unique `old_string` that matches exactly
   once. Replace or patch in place. **Never append** a second copy of the same function,
   class, or `if __name__ == "__main__"` block.
5. **Failed edit** — If `edit_file` fails, `read_file` again and either fix the match
   or overwrite the entire file with `write_file` (full corrected content), not a partial
   append.
6. **Secrets** — Read API keys from environment variables (e.g. `os.getenv("OPENWEATHER_API_KEY")`).
   Never hardcode keys or paste `YOUR_API_KEY` placeholders in committed paths.
7. **Save to** `/workspace/<descriptive_name>.py` (or `.md` for docs-only output).
8. **Self-check before finishing** — Confirm the file has no duplicate function or
   class definitions (grep mentally: each `def` / `class` name appears once).
9. When the user asked to **test** the code, hand off to `test-runner` after saving.

## Anti-patterns (never do this)

- Writing `get_weather` twice in the same file
- Adding a second `if __name__ == "__main__":` block at the bottom after a failed retry
- Mixing two styles (env-based key + hardcoded key) in one file
- Calling `write_file` on a path that already exists without reading it first

## Example

**Input:** "Generate a Python script to check weather for a city"

**Output:** `/workspace/check_weather.py` — single `get_weather` function, one main block,
`OPENWEATHER_API_KEY` from env, brief error handling.
