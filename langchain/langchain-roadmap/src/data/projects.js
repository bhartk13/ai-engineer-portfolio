// Portfolio project blueprints.

export const projectsData = [
  {
    id: 1,
    emoji: "📄",
    name: "DocuMind",
    subtitle: "PDF Q&A Bot",
    difficulty: "Beginner",
    diffColor: "#059669",
    diffBg: "#ecfdf5",
    cost: "~$0.01/session",
    accentBar: "#059669",
    tech: ["RAG", "FAISS", "PyPDF", "Streamlit"],
    skills: ["retrievers"],
    description: "Upload any PDF and chat with it. Uses local FAISS vector store — no database needed.",
    structure: `documind/
├── app.py
├── rag.py
├── requirements.txt
├── .env.example
└── README.md`,
    wow: "Drag-and-drop PDF → instant Q&A. Works with research papers, contracts, manuals.",
  },
  {
    id: 2,
    emoji: "🤖",
    name: "AutoResearcher",
    subtitle: "Web Agent",
    difficulty: "Intermediate",
    diffColor: "#b45309",
    diffBg: "#fffbeb",
    cost: "~$0.05/query",
    accentBar: "#b45309",
    tech: ["Agents", "DuckDuckGo", "LangGraph", "FastAPI"],
    skills: ["agents", "langgraph", "tools"],
    description: "Give it a topic, it searches the web, synthesizes findings, and writes a structured report.",
    structure: `auto-researcher/
├── agent.py
├── tools.py
├── api.py
├── requirements.txt
└── README.md`,
    wow: "Autonomous research loop — the agent decides how many searches to run before answering.",
  },
  {
    id: 3,
    emoji: "💬",
    name: "MemoryBot",
    subtitle: "Persistent Chatbot",
    difficulty: "Beginner",
    diffColor: "#059669",
    diffBg: "#ecfdf5",
    cost: "~$0.002/msg",
    accentBar: "#059669",
    tech: ["Memory", "SQLite", "Streamlit", "Session History"],
    skills: ["prompts", "runnables"],
    description: "A chatbot that remembers your conversations across sessions using SQLite for free persistence.",
    structure: `memorybot/
├── app.py
├── memory.py
├── chain.py
├── requirements.txt
└── README.md`,
    wow: "Restart the app and it still remembers you — no cloud DB required.",
  },
  {
    id: 4,
    emoji: "🔍",
    name: "CodeReviewer",
    subtitle: "AI Code Analyst",
    difficulty: "Intermediate",
    diffColor: "#b45309",
    diffBg: "#fffbeb",
    cost: "~$0.02/review",
    accentBar: "#b45309",
    tech: ["Custom Tools", "Structured Output", "GitHub API", "Pydantic"],
    skills: ["tools", "lcel"],
    description: "Paste code or give a GitHub URL. Get structured review: bugs, improvements, security issues.",
    structure: `code-reviewer/
├── app.py
├── reviewer.py
├── schemas.py
├── github_tool.py
└── README.md`,
    wow: "Returns structured JSON: severity levels, line numbers, fix suggestions — not just prose.",
  },
  {
    id: 5,
    emoji: "🧠",
    name: "MultiAgent Planner",
    subtitle: "LangGraph Boss",
    difficulty: "Advanced",
    diffColor: "#dc2626",
    diffBg: "#fff1f2",
    cost: "~$0.10/task",
    accentBar: "#dc2626",
    tech: ["LangGraph", "Multi-Agent", "Tool Calling", "FastAPI"],
    skills: ["langgraph", "agents", "callbacks"],
    description: "A supervisor agent that delegates tasks to specialized sub-agents: researcher, writer, critic.",
    structure: `multi-agent-planner/
├── graph.py
├── agents/
│   ├── researcher.py
│   ├── writer.py
│   └── critic.py
├── api.py
└── README.md`,
    wow: "Watch multiple AI agents collaborate in real-time with a visual graph of their decisions.",
  },
];
