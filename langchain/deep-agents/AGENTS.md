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
- Do **not** write to `blogs/`, `/tmp/`, or other paths outside `/workspace/`.
- Orchestrator delegates heavy sub-tasks to subagents to keep the main thread focused.
- Before specialized work, agents **must** `read_file` on the matching `SKILL.md`.

## Multi-Agent Workflow (example)

For: *"Research LangGraph multi-agent patterns and write a short blog post"*

1. Orchestrator creates a plan (`write_todos`).
2. Orchestrator delegates research to a subagent → loads `research` skill → saves
   `workspace/research_langgraph_agents.md`.
3. Orchestrator delegates writing to a subagent → loads `writer` skill → reads research
   file → saves `workspace/draft_langgraph_blog.md`.
4. Orchestrator summarizes what was produced and where files live.

## Adding Capabilities

Drop a new folder under `skills/` with a `SKILL.md` — no code changes required.
Restart the app so the skill catalog refreshes.
