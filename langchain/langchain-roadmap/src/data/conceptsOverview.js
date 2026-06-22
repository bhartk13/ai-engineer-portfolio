// Page-level guide for the Core Concepts deep-dive section.

export const conceptsOverview = {
  title: "Core Concepts — LangChain Primitives",
  subtitle: "8 building blocks every LangChain developer must understand",
  hours: "8–12 hours total",
  accent: "#7c3aed",
  bg: "linear-gradient(135deg, #a78bfa 0%, #c4b5fd 45%, #818cf8 100%)",
  innerBg: "rgba(124, 58, 237, 0.22)",
  innerBorder: "rgba(124, 58, 237, 0.35)",
  description:
    "These eight concepts are the vocabulary of modern LangChain. Master them and you can read any tutorial, debug any agent, and swap components without rewriting your app. Each deep-dive includes theory, step-by-step guides, LangChain 1.x code, hands-on exercises, and migration notes for deprecated APIs.",
  goals: [
    "Compose pipelines with LCEL and understand the Runnable interface",
    "Write reusable prompt templates and output parsers",
    "Build RAG with indexing, retrieval, and agentic patterns",
    "Define tools and agents with `create_agent` (not AgentExecutor)",
    "Model custom workflows in LangGraph with state and checkpointing",
    "Observe and debug with callbacks and LangSmith tracing",
  ],
  studyPath: [
    { order: "1–2", focus: "LCEL + Runnables + Prompts", deliverable: "Multi-step chain with streaming" },
    { order: "3–4", focus: "RAG + Tools", deliverable: "Document Q&A + custom @tool functions" },
    { order: "5–6", focus: "Agents + LangGraph", deliverable: "create_agent harness + custom StateGraph" },
    { order: "7–8", focus: "Callbacks + production observability", deliverable: "Traced chain with LangSmith" },
  ],
  outcome:
    "You'll speak LangChain fluently — knowing not just what each primitive does, but when to use it, how it connects to the others, and which APIs are current vs. deprecated.",
  docsNote:
    "All code examples target LangChain 1.x / LangGraph 1.x (2025–2026). Use `langchain_core` imports, `init_chat_model`, `create_agent`, and `LANGSMITH_TRACING`. Avoid `AgentExecutor`, `create_react_agent`, and `langchain.schema` import paths.",
};
