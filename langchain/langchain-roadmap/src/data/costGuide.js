// Cost-guide content for learning LangChain on a budget.

export const costTiers = [
  {
    tier: "🆓 Free Tier",
    cost: "$0 / month",
    color: "#059669",
    items: [
      "Ollama + Llama 3.2 (local LLM)",
      "HuggingFace Embeddings",
      "FAISS vector store (local)",
      "DuckDuckGo search tool",
      "LangSmith (5K traces free)",
      "Groq API (free tier, very fast)",
    ],
  },
  {
    tier: "💸 Paid (Optional)",
    cost: "$2–10 / month",
    color: "#b45309",
    items: [
      "OpenAI gpt-4o-mini (very cheap)",
      "text-embedding-3-small ($0.02/1M)",
      "Claude Haiku (cheapest + smartest)",
      "Pinecone free tier (vector DB)",
      "LangSmith Pro for heavy tracing",
    ],
  },
];

export const modelComparison = {
  headers: ["Model", "Cost / 1M tokens", "Speed", "Agent Quality", "Best For"],
  rows: [
    ["Llama 3.2 (Ollama)", "FREE", "Medium", "⭐⭐⭐", "Learning, local dev"],
    ["Groq Llama 3.3", "FREE tier", "🚀 Very Fast", "⭐⭐⭐⭐", "RAG & chatbots"],
    ["GPT-4o-mini", "$0.15 / $0.60", "Fast", "⭐⭐⭐⭐⭐", "Best budget default"],
    ["Claude Haiku", "$0.25 / $1.25", "Fast", "⭐⭐⭐⭐⭐", "Best value for agents"],
    ["GPT-4o", "$2.50 / $10", "Fast", "⭐⭐⭐⭐⭐", "Complex reasoning"],
  ],
};

export const budgetStrategy =
  "Use Groq (free, blazing fast) during development → switch to Claude Haiku or gpt-4o-mini for portfolio demos → all 5 projects for under $3 total in API costs.";
