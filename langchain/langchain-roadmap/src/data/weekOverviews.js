// Week-level learning guides shown at the top of each week's lessons.

export const weekOverviews = {
  1: {
    title: "Week 1 — Foundations & RAG",
    subtitle: "From zero to a working retrieval pipeline",
    hours: "12–15 hours",
    accent: "#2563eb",
    bg: "linear-gradient(135deg, #60a5fa 0%, #93c5fd 45%, #818cf8 100%)",
    innerBg: "rgba(37, 99, 235, 0.22)",
    innerBorder: "rgba(37, 99, 235, 0.35)",
    description:
      "Week 1 builds the mental model and hands-on skills every LangChain developer needs. You start with the modern package layout and LCEL, add conversational memory, then implement a full RAG pipeline. By Day 7 you ship your first agent using the current `create_agent` API (LangChain 1.x) — not the deprecated `AgentExecutor`.",
    goals: [
      "Understand LangChain 1.x package structure (`langchain`, `langchain-core`, provider packages)",
      "Compose chains with LCEL and `init_chat_model`",
      "Persist multi-turn chat with LangGraph checkpointers (`thread_id`)",
      "Build indexing + retrieval for RAG (load → split → embed → store → retrieve)",
      "Create a tool-calling agent with `create_agent`",
    ],
    dailyPlan: [
      { day: "Day 1–2", focus: "Environment, models, prompts, LCEL chains", deliverable: "A reusable Q&A chain with streaming" },
      { day: "Day 3–4", focus: "Memory & conversation state", deliverable: "Chatbot that remembers prior turns per session" },
      { day: "Day 5–6", focus: "RAG indexing + agentic & two-step retrieval", deliverable: "Q&A over your own documents" },
      { day: "Day 7", focus: "Tools + first agent", deliverable: "Agent that searches web and runs custom tools" },
    ],
    outcome: "You'll understand how LangChain pieces fit together and can build a document Q&A bot — the foundation for every portfolio project.",
    docsNote:
      "LangChain 1.x (2025–2026): use `create_agent` for agents, `init_chat_model(\"provider:model\")` for models, and `langchain_core` / `langchain_text_splitters` for imports. `AgentExecutor` and `create_react_agent` are legacy — avoid in new code.",
  },
  2: {
    title: "Week 2 — Agents, LangGraph & Production",
    subtitle: "Stateful workflows you can ship",
    hours: "14–18 hours",
    accent: "#7c3aed",
    bg: "linear-gradient(135deg, #c4b5fd 0%, #ddd6fe 45%, #a78bfa 100%)",
    innerBg: "rgba(124, 58, 237, 0.22)",
    innerBorder: "rgba(124, 58, 237, 0.35)",
    description:
      "Week 2 goes from capable prototypes to production patterns. You deepen agent behavior with middleware and structured tools, orchestrate custom flows in LangGraph, then add streaming, LangSmith tracing, and a FastAPI deployment layer. LangChain agents are built on LangGraph — you'll learn when to use the harness vs. building the graph yourself.",
    goals: [
      "Configure agents with middleware (context injection, guardrails, HITL)",
      "Define structured tools with Pydantic schemas",
      "Model workflows as LangGraph `StateGraph` with checkpointing",
      "Stream tokens and trace runs in LangSmith",
      "Expose an agent/chain via FastAPI for portfolio demos",
    ],
    dailyPlan: [
      { day: "Day 8–9", focus: "Advanced agents, middleware, multi-tool", deliverable: "Production-style agent with structured tools" },
      { day: "Day 10–11", focus: "LangGraph state, routing, persistence", deliverable: "Custom research loop with conditional edges" },
      { day: "Day 12–14", focus: "Streaming, observability, deployment", deliverable: "Traced, streaming API ready to demo" },
    ],
    outcome: "You'll be able to design agentic systems with explicit control, debug them in LangSmith, and deploy a portfolio-quality API.",
    docsNote:
      "LangGraph 1.x is the orchestration layer underneath `create_agent`. Use LangGraph directly when you need custom loops, parallel nodes, or human-in-the-loop gates. LangSmith env vars are now `LANGSMITH_TRACING` + `LANGSMITH_API_KEY`.",
  },
};
