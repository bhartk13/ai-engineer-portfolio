# Research length limits

Prevent runaway research files that break writer/deploy pipelines.

## Hard limits (main report)

| Section | Limit |
|---------|-------|
| Total lines | **250 max** |
| Executive summary | 5 bullets |
| Key finding themes | 8 max |
| Bullets per theme | 5 max |

## Overflow policy

If research exceeds limits:

1. Keep `/workspace/research_<topic>.md` as the **handoff summary** (within limits).
2. Write detailed notes to `/workspace/research_<topic>_detail.md`.
3. Add at top of main file: `See [detailed notes](research_<topic>_detail.md) for extended findings.`

## Before finishing

- Count lines mentally; trim repetition.
- Merge duplicate themes.
- Move raw search snippets to `_detail.md`, not the main report.
