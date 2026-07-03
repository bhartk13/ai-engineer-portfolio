# Pytest guide for workspace tests

## Layout

```
/workspace/
├── my_module.py
└── test_my_module.py   # pytest discovers test_ prefix
```

## Mode selection

| mode | Use when |
|------|----------|
| `auto` | Default — let the tool decide |
| `pytest` | You created `test_*.py` or a `tests/` folder |
| `smoke` | Quick run of a standalone script with `if __name__ == "__main__"` |

## After failure

1. Read the test report stderr section.
2. Load `code-generator` and fix the source file (full overwrite if edits fail).
3. Re-run `run_workspace_tests` — do not append duplicate functions.
