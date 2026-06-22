// Interactive quizzes, grouped by topic. Each question has 4 options,
// a correct index, and an explanation shown after answering.

export const quizzes = [
  {
    id: "fundamentals",
    title: "Fundamentals & LCEL",
    icon: "⛓️",
    accent: "#2563eb",
    description: "Prompts, chains, runnables, and the pipe operator.",
    questions: [
      {
        q: "What does the | (pipe) operator do in LCEL?",
        options: [
          "Runs two chains in parallel",
          "Composes Runnables so each step's output feeds the next",
          "Filters the LLM output",
          "Concatenates two strings",
        ],
        answer: 1,
        explanation:
          "The | operator creates a RunnableSequence — output of the left becomes input of the right, just like Unix pipes.",
      },
      {
        q: "Which method runs a Runnable on many inputs in parallel?",
        options: ["invoke()", "stream()", "batch()", "map()"],
        answer: 2,
        explanation: "batch() processes a list of inputs in parallel and returns a list of outputs.",
      },
      {
        q: "What is the purpose of StrOutputParser?",
        options: [
          "It validates the prompt template",
          "It extracts the plain text string from a chat message response",
          "It streams tokens to the console",
          "It splits documents into chunks",
        ],
        answer: 1,
        explanation:
          "ChatModels return a message object; StrOutputParser pulls out the .content string so the chain returns plain text.",
      },
      {
        q: "How do you wrap a plain Python function so it can join an LCEL chain?",
        options: ["@chain decorator", "RunnableLambda(fn)", "FunctionTool(fn)", "wrap(fn)"],
        answer: 1,
        explanation:
          "RunnableLambda turns any callable into a Runnable so it can be composed with | in a chain.",
      },
      {
        q: "Which is TRUE about ChatPromptTemplate.from_messages?",
        options: [
          "It only supports a single human message",
          "It can include system, human, ai messages and MessagesPlaceholder",
          "It cannot use variables",
          "It returns a finished LLM response",
        ],
        answer: 1,
        explanation:
          "from_messages builds multi-turn prompts with typed roles and supports MessagesPlaceholder for history.",
      },
    ],
  },
  {
    id: "rag",
    title: "RAG & Retrieval",
    icon: "🔍",
    accent: "#dc2626",
    description: "Loaders, splitters, embeddings, vector stores, retrievers.",
    questions: [
      {
        q: "Why does RAG reduce hallucinations?",
        options: [
          "It uses a larger model",
          "It grounds the answer in retrieved source documents",
          "It lowers the temperature to 0",
          "It caches previous answers",
        ],
        answer: 1,
        explanation:
          "RAG injects relevant retrieved context into the prompt, so the model answers from real data instead of guessing.",
      },
      {
        q: "What does chunk_overlap prevent?",
        options: [
          "Duplicate documents in the store",
          "Losing context at the boundaries between chunks",
          "Embedding cost overruns",
          "Token limit errors",
        ],
        answer: 1,
        explanation:
          "Overlap keeps continuity so a sentence split across two chunks still has surrounding context in each.",
      },
      {
        q: "Which embedding option is free and runs locally?",
        options: [
          "OpenAIEmbeddings",
          "CohereEmbeddings",
          "HuggingFaceEmbeddings (all-MiniLM-L6-v2)",
          "VertexAIEmbeddings",
        ],
        answer: 2,
        explanation: "HuggingFace sentence-transformers run locally for free — great for zero-cost RAG.",
      },
      {
        q: "What does search_type='mmr' give you?",
        options: [
          "Faster retrieval",
          "More diverse (less redundant) retrieved chunks",
          "Exact keyword matching",
          "Cheaper embeddings",
        ],
        answer: 1,
        explanation:
          "Maximal Marginal Relevance balances similarity with diversity so you don't get near-duplicate chunks.",
      },
      {
        q: "In a retrieval chain, what is the retriever responsible for?",
        options: [
          "Generating the final answer",
          "Finding the top-k most relevant chunks for a query",
          "Splitting documents",
          "Formatting the prompt",
        ],
        answer: 1,
        explanation:
          "A retriever takes a query and returns the most relevant documents from the vector store.",
      },
    ],
  },
  {
    id: "agents",
    title: "Tools & Agents",
    icon: "🤖",
    accent: "#b45309",
    description: "@tool, create_agent, tool calling, middleware.",
    questions: [
      {
        q: "What is the LangChain 1.x standard for building agents?",
        options: [
          "AgentExecutor with create_react_agent",
          "create_agent (built on LangGraph)",
          "LLMChain with tools parameter",
          "Custom for-loop calling OpenAI API",
        ],
        answer: 1,
        explanation:
          "LangChain 1.x uses create_agent — a configurable harness built on LangGraph. AgentExecutor and create_react_agent are deprecated.",
      },
      {
        q: "What does the ReAct pattern stand for?",
        options: ["Retrieve + Act", "Reason + Act", "React + Async", "Recall + Action"],
        answer: 1,
        explanation: "ReAct = Reason then Act: the agent thinks, calls a tool, observes, and repeats.",
      },
      {
        q: "How do you add memory to a create_agent agent?",
        options: [
          "Pass memory=True to create_agent",
          "Pass checkpointer=InMemorySaver() and reuse thread_id in config",
          "Use ConversationBufferMemory class",
          "Memory is automatic — no setup needed",
        ],
        answer: 1,
        explanation:
          "LangChain 1.x agents use LangGraph checkpointers. Pass checkpointer=InMemorySaver() and scope conversations with thread_id in config.",
      },
      {
        q: "Which temperature is recommended for agents?",
        options: ["1.0 for creativity", "0 for deterministic tool selection", "0.7", "2.0"],
        answer: 1,
        explanation:
          "temperature=0 makes tool selection deterministic — you want reliable decisions, not creative guesses.",
      },
      {
        q: "Why is native function/tool calling preferred over ReAct text parsing?",
        options: [
          "It is cheaper",
          "It is more reliable — structured tool calls instead of fragile text parsing",
          "It supports more tools",
          "It runs offline",
        ],
        answer: 1,
        explanation:
          "Function calling returns structured arguments the framework can execute directly, avoiding brittle text parsing.",
      },
    ],
  },
  {
    id: "langgraph",
    title: "LangGraph & Memory",
    icon: "🕸️",
    accent: "#7c3aed",
    description: "State, nodes, edges, checkpointing, history.",
    questions: [
      {
        q: "In LangGraph, what flows through every node?",
        options: ["The prompt only", "A shared State object", "The LLM model", "The tool list"],
        answer: 1,
        explanation: "A typed State (often a TypedDict) is the shared memory passed through all nodes.",
      },
      {
        q: "What does Annotated[list, operator.add] do for a state field?",
        options: [
          "Replaces the list on each update",
          "Appends to the list instead of replacing it",
          "Sorts the list",
          "Deduplicates the list",
        ],
        answer: 1,
        explanation: "It defines a reducer that appends node outputs rather than overwriting them.",
      },
      {
        q: "How do you add persistent memory across invocations in LangGraph?",
        options: [
          "Set memory=True",
          "Compile with a checkpointer (e.g. MemorySaver)",
          "Use ConversationBufferMemory",
          "Add a memory node",
        ],
        answer: 1,
        explanation: "Compiling with a checkpointer persists state so threads can resume later.",
      },
      {
        q: "What makes RunnableWithMessageHistory useful?",
        options: [
          "It summarizes documents",
          "It attaches per-session chat history to any chain",
          "It parses JSON output",
          "It runs tools",
        ],
        answer: 1,
        explanation:
          "It wraps a chain and loads/saves message history keyed by session_id so the bot remembers conversations.",
      },
      {
        q: "What does interrupt_before=['node'] enable?",
        options: [
          "Faster execution",
          "A human-in-the-loop pause before a node runs",
          "Error handling",
          "Parallel nodes",
        ],
        answer: 1,
        explanation: "It pauses the graph so a human can review/approve before that node executes.",
      },
    ],
  },
];
