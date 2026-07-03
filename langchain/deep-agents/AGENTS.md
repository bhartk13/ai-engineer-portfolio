# Project Context: Deep Agents Demo

## Core Mission

Demonstrate **Deep Agent** architecture with LangChain: a generic orchestrator, runtime
skill discovery via `SKILL.md`, and multi-agent collaboration through shared files in
`./workspace/`.

Inspired by the [Agent Skills specification](https://agentskills.io) and progressive
disclosure — agents see skill metadata first, full instructions only when relevant.

## Team Roles

| Role | Responsibility | Typical skill |
|------|----------------|---------------|
| **Orchestrator** | Plans with `write_todos`, routes tasks, delegates | (none — generic) |
| **Researcher** | Web search, synthesis, structured notes | `research` |
| **Writer** | Outlines and drafts from research artifacts | `writer` |
| **Coder** | New scripts and utilities in workspace | `code-generator` |
| **Reviewer** | Code/content review with structured feedback | `code-reviewer` |
| **Publisher** | Static site build + free cloud deploy (Netlify default) | `static-deploy` |

Subagents spawned via the `task` tool use the `general-purpose` type. They share this
`AGENTS.md` context and the same skill library.

## Autonomy rules (critical)

- **Never ask the user to choose** among platforms, tools, or formats when a reasonable default exists.
- **Deployment default:** Netlify free static hosting via `deploy_static_site` — do not prompt for Vercel/Netlify/GitHub Pages.
- **Execute end-to-end:** research → write → save → deploy in one run when requested.
- **Same conversation thread:** short follow-ups (e.g. "use vercel") clarify the current task; do not restart as a new unrelated goal.
- Log autonomous decisions in `workspace/deploy_report_<slug>.md`.

## Conventions

- Skills live under `skills/<name>/SKILL.md`; folder name should match YAML `name`.
- **All artifacts** (research notes, drafts, reviews) go to `/workspace/` only (virtual path).
- Use predictable filenames so agents can hand off work:
  - `/workspace/research_<topic>.md` — raw research summaries
  - `/workspace/draft_<topic>.md` — written content
  - `/workspace/review_<target>.md` — review output
  - `/workspace/sites/<slug>/index.html` — static site bundle
  - `/workspace/deploy_report_<slug>.md` — deploy log + URL
  - `/workspace/<name>.py` — generated scripts and utilities
- Do **not** write to `blogs/`, `/tmp/`, or other paths outside `/workspace/`.
- Orchestrator delegates heavy sub-tasks to subagents to keep the main thread focused.
- Before specialized work, agents **must** `read_file` on the matching `SKILL.md`.

## Code file rules (critical)

When creating or changing code under `/workspace/`:

1. **Load `code-generator`** before writing new scripts; load **`code-reviewer`** only for review tasks.
2. **`read_file` before `write_file` or `edit_file`** if the path might already exist.
3. **One definition per name** — each function, class, and `if __name__ == "__main__"` block appears **at most once** per file.
4. **`edit_file` replaces in place** — never append a second copy of the same function at the end of the file.
5. **Retry policy** — if an edit fails, re-read the file and overwrite with the full corrected file; do not stack duplicate blocks.
6. **Secrets in env** — use `os.getenv(...)`; never hardcode API keys in workspace files.

## Multi-Agent Workflow (example)

For: *"Research LangGraph multi-agent patterns and write a short blog post"*

1. Orchestrator creates a plan (`write_todos`).
2. Orchestrator delegates research to a subagent → loads `research` skill → saves
   `workspace/research_langgraph_agents.md`.
3. Orchestrator delegates writing to a subagent → loads `writer` skill → reads research
   file → saves `workspace/draft_langgraph_blog.md`.
4. Orchestrator summarizes what was produced and where files live.

For: *"Generate a Python script to check weather"*

1. Orchestrator loads `code-generator` skill.
2. Subagent reads existing file if present → writes **one** `/workspace/check_weather.py`.
3. Optional: delegate `code-reviewer` if user asked for review.

## Adding Capabilities

Drop a new folder under `skills/` with a `SKILL.md` — no code changes required.
Restart the app so the skill catalog refreshes.
