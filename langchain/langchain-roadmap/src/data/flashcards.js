// Flashcards for quick recall practice, grouped by deck.

export const flashcardDecks = [
  {
    id: "core",
    title: "Core Building Blocks",
    icon: "🧱",
    accent: "#2563eb",
    cards: [
      { front: "What is a Runnable?", back: "The universal interface every LangChain component implements. If it has .invoke(), it's a Runnable — enabling LCEL composition." },
      { front: "What is LCEL?", back: "LangChain Expression Language — compose components with the | operator: prompt | llm | parser." },
      { front: "What does StrOutputParser do?", back: "Extracts the plain text .content from a chat model's message response." },
      { front: "invoke vs stream vs batch?", back: "invoke = one input/one output (sync); stream = yields chunks; batch = many inputs in parallel." },
      { front: "What is a PromptTemplate?", back: "A parameterized, reusable prompt with {variables}, validation, and message-role support." },
      { front: "What is MessagesPlaceholder?", back: "A slot in a ChatPromptTemplate where a list of messages (like chat history) is inserted." },
    ],
  },
  {
    id: "rag",
    title: "RAG Pipeline",
    icon: "🔍",
    accent: "#dc2626",
    cards: [
      { front: "The 6 RAG steps?", back: "Load → Split → Embed → Store → Retrieve → Generate." },
      { front: "What is an embedding?", back: "A vector of numbers that captures the semantic meaning of text, used for similarity search." },
      { front: "Why use chunk_overlap?", back: "To preserve context across chunk boundaries (~10% of chunk_size is a good default)." },
      { front: "What is a vector store?", back: "A database for embeddings that supports fast similarity search. FAISS (local) or Pinecone (cloud)." },
      { front: "What is MMR retrieval?", back: "Maximal Marginal Relevance — retrieves diverse, less redundant chunks instead of near-duplicates." },
      { front: "Free RAG stack?", back: "HuggingFace embeddings + FAISS vector store = zero-cost retrieval." },
    ],
  },
  {
    id: "agents",
    title: "Tools & Agents",
    icon: "🤖",
    accent: "#b45309",
    cards: [
      { front: "What is the @tool decorator?", back: "Turns a Python function into a tool an agent can call; the docstring tells the LLM when to use it." },
      { front: "What is ReAct?", back: "Reason + Act — the agent loop: think, call a tool, observe the result, repeat until done." },
      { front: "Why set max_iterations?", back: "To stop a confused agent from looping forever calling tools." },
      { front: "Chain vs Agent?", back: "A chain is a fixed recipe (A→B→C). An agent dynamically decides the path based on context." },
      { front: "Best temperature for agents?", back: "0 — you want deterministic, reliable tool selection, not creative guessing." },
      { front: "Why prefer function calling over ReAct?", back: "Structured tool calls are far more reliable than parsing free-form text." },
    ],
  },
  {
    id: "langgraph",
    title: "LangGraph & Memory",
    icon: "🕸️",
    accent: "#7c3aed",
    cards: [
      { front: "What is a StateGraph?", back: "A graph of nodes (functions) and edges (transitions) with a shared State flowing through it." },
      { front: "create_agent vs LangGraph?", back: "create_agent is a pre-built LangGraph harness for tool-calling loops. Use LangGraph directly when you need custom routing, parallel nodes, or human-in-the-loop." },
      { front: "What is a conditional edge?", back: "An edge that routes to different nodes based on a function reading the current state." },
      { front: "How to persist memory in LangGraph?", back: "Compile the graph with a checkpointer like MemorySaver()." },
      { front: "What is RunnableWithMessageHistory?", back: "Wraps a chain to load/save per-session chat history keyed by session_id." },
      { front: "What does interrupt_before do?", back: "Pauses the graph before a node so a human can approve/edit (human-in-the-loop)." },
    ],
  },
  {
    id: "production",
    title: "Production & Observability",
    icon: "🚀",
    accent: "#059669",
    cards: [
      { front: "What are callbacks?", back: "Event hooks firing at each step (LLM start, new token, tool call, error) for logging, streaming, and tracing." },
      { front: "How to enable LangSmith tracing?", back: "Set LANGSMITH_TRACING=true and LANGSMITH_API_KEY in .env — zero code changes. (Legacy: LANGCHAIN_TRACING_V2)" },
      { front: "How do you stream responses in FastAPI?", back: "Use chain.astream() inside a StreamingResponse with media_type text/event-stream." },
      { front: "What does .with_retry() do?", back: "Adds automatic retry logic to any Runnable on failure." },
      { front: "What does .with_fallbacks() do?", back: "Falls back to an alternate chain/model if the primary one fails." },
    ],
  },
];
