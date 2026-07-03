---
name: test-runner
description: >
  Runs pytest or smoke tests on workspace Python files and saves a test report.
  Use after code-generator when the user asks to test, verify, validate, or run
  a script. Do NOT use for code review feedback (use code-reviewer) or data analysis.
license: MIT
allowed-tools: run_workspace_tests Read Write
---

# Test Runner Skill

## Overview

Execute automated checks on generated or edited Python code in `/workspace/`.

## Instructions

1. Identify the target file or test directory (e.g. `/workspace/check_weather.py`).
2. Load `skills/test-runner/references/pytest-guide.md` when pytest layout is unclear.
3. Call `run_workspace_tests(target="/workspace/<file>.py", mode="auto")`.
   - `auto` — pytest for `test_*.py` or directories; otherwise smoke-run the script.
   - `pytest` — force pytest.
   - `smoke` — run `python <file>` once.
4. Read `/workspace/test_report_<name>.md` and summarize pass/fail for the user.
5. If tests fail, delegate fixes to `code-generator` (read → overwrite, no duplication).

## Outputs

| Artifact | Path |
|----------|------|
| Test report | `/workspace/test_report_<name>.md` |

## Example

**Input:** "Generate a weather script and test it"

**Pipeline:** `code-generator` → write file → `test-runner` → report path + summary.
