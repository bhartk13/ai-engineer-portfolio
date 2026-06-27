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

Subagents spawned via the `task` tool use the `general-purpose` type. They share this
`AGENTS.md` context and the same skill library.

## Conventions

- Skills live under `skills/<name>/SKILL.md`; folder name should match YAML `name`.
- **All artifacts** (research notes, drafts, reviews) go to `./workspace/` only.
- Use predictable filenames so agents can hand off work:
  - `workspace/research_<topic>.md` — raw research summaries
  - `workspace/draft_<topic>.md` — written content
  - `workspace/review_<target>.md` — review output
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
