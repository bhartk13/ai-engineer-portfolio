# Claude Mastery — Architect Track

> An interactive, self-paced course that takes you from the fundamentals of the Claude AI ecosystem to **Claude Certified Architect**–level fluency — with checkpoints, a scenario-based mock exam, and progress tracking.

Built as a single-page React app. No backend, no accounts — your progress is saved locally in your browser. Deploy it to GitHub Pages in two clicks, or open the standalone HTML file offline.

**Content current as of June 2026.** Models, pricing, and availability change quickly — always verify volatile facts against [docs.claude.com](https://docs.claude.com). This project is not affiliated with or endorsed by Anthropic.

---

## What it covers

Twelve modules, ~34 lessons, 30+ knowledge checks, and a 24-scenario exam pool. The curriculum is deliberately comprehensive — it covers the *whole* ecosystem, not just prompt-writing.

| #  | Module | Focus |
|----|--------|-------|
| 01 | Foundations & the Claude ecosystem | What Claude is, Constitutional AI, tokens/context, the product surface |
| 02 | Claude models & model selection | Haiku/Sonnet/Opus + Mythos-class tier, capabilities, routing |
| 03 | Prompt engineering | Clarity, system prompts, structured output, extended thinking |
| 04 | Projects, Artifacts & Claude.ai features | Persistent knowledge, generated apps, connectors |
| 05 | The Claude API | Messages, streaming, vision, Files API, prompt caching, Batch |
| 06 | Tool use (function calling) | The tool loop, schema design, structured output via tools |
| 07 | Model Context Protocol (MCP) | Hosts/clients/servers, primitives, integration security |
| 08 | Agents & agentic workflows | Workflow vs. agent, the loop, subagents, verification, memory |
| 09 | Retrieval-Augmented Generation (RAG) | Pipeline, chunking/embeddings, retrieval quality, alternatives |
| 10 | Coding workflows & Claude Code | Agentic coding, prompting for code, the SDLC |
| 11 | Security, safety & evaluation | Prompt injection, data governance, jailbreaks, eval harnesses |
| 12 | Enterprise architecture & use cases | Reference architecture, platforms, cost playbook, capstone |

Each module ends with a **checkpoint quiz**; full marks marks the module complete. The **mock exam** draws random scenario questions across all domains and grades against an 80% pass mark, with full rationale on every question.

See [`SYLLABUS.md`](./SYLLABUS.md) for the full lesson-by-lesson outline.

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server
npm run dev        # → http://localhost:5173

# 3. Build for production
npm run build      # → ./dist
npm run preview    # preview the production build
```

Requires Node.js 18+.

### Offline / no-build option

Open **`claude-mastery-standalone.html`** directly in any browser. It's a single self-contained file with all JS and CSS inlined — no server, no install.

---

## Deploy to GitHub Pages

This repo ships with a GitHub Actions workflow ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)) that builds and deploys on every push to `main`.

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to `main`. Your site deploys automatically.

The Vite config uses `base: './'`, so it works from any sub-path without further configuration.

---

## Project structure

```
claude-mastery/
├── index.html                       # Vite entry
├── claude-mastery-standalone.html   # self-contained, build-free version
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx                       # all views: home, module, exam
│   ├── styles/app.css                # design system
│   └── data/
│       ├── curriculum.js             # modules 01–02
│       ├── curriculum-2.js           # modules 03–06
│       ├── curriculum-3.js           # modules 07–12
│       └── exam.js                   # mock-exam question bank
├── .github/workflows/deploy.yml
├── SYLLABUS.md
├── CONTRIBUTING.md
└── LICENSE
```

All learning content lives in `src/data/`. To add or correct a lesson, edit those files — no component changes needed.

---

## How to study with it

1. **Work the modules in order.** Each builds on the last; Foundations → Models → Prompting is the spine.
2. **Don't skip the code.** Read every snippet; the patterns (routing, the tool loop, RAG query flow, LLM-as-judge) are the exam.
3. **Pass every checkpoint at 100%** before moving on. Re-read the lesson if a check trips you.
4. **Run the mock exam repeatedly.** Fresh question sets each time. Target a consistent 90%+, not a one-time pass.
5. **Build alongside.** The fastest way to lock this in is to implement a small RAG bot, a tool-using agent, and an eval harness yourself.

---

## Contributing

Corrections and improvements are welcome — especially keeping model names, pricing, and feature claims current. See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT — see [`LICENSE`](./LICENSE).
