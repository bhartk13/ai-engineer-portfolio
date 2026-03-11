import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLES
// ─────────────────────────────────────────────────────────────────────────────
const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};
const pageWrap = {
  minHeight: "100vh",
  background: "#f1f5f9",
  fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  color: "#1e293b",
};

// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP DATA
// ─────────────────────────────────────────────────────────────────────────────
const days = [
  {
    week: 1, day: "Day 1–2", title: "LangChain Fundamentals",
    accent: "#0066ff", bg: "#eff4ff",
    concepts: ["LLM wrappers (OpenAI, Ollama)", "PromptTemplates", "Chains (LLMChain)", "Output parsers"],
    code: `# Install
pip install langchain langchain-openai python-dotenv

# .env
OPENAI_API_KEY=sk-...

from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
from dotenv import load_dotenv

load_dotenv()

llm    = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.7)
prompt = ChatPromptTemplate.from_template(
    "You are a helpful assistant. Answer: {question}"
)

# LCEL chain (modern syntax)
chain = prompt | llm | StrOutputParser()

response = chain.invoke({"question": "What is LangChain?"})
print(response)

# FREE alternative — Ollama locally
# from langchain_ollama import OllamaLLM
# llm = OllamaLLM(model="llama3.2")`,
    tip: "Use gpt-3.5-turbo ($0.001/1K tokens) or Ollama (free local) to keep costs near zero while learning.",
  },
  {
    week: 1, day: "Day 3–4", title: "Memory & Conversation",
    accent: "#7c3aed", bg: "#f5f3ff",
    concepts: ["ConversationBufferMemory", "ConversationSummaryMemory", "Chat history", "RunnableWithMessageHistory"],
    code: `from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory

llm    = ChatOpenAI(model="gpt-3.5-turbo")
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI assistant."),
    MessagesPlaceholder(variable_name="history"),
    ("human", "{input}"),
])
chain  = prompt | llm

store  = {}
def get_session_history(session_id: str):
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

with_history = RunnableWithMessageHistory(
    chain, get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)
config = {"configurable": {"session_id": "user_123"}}

with_history.invoke({"input": "My name is Alex"}, config=config)
r2 = with_history.invoke({"input": "What's my name?"}, config=config)
print(r2.content)   # "Your name is Alex!"`,
    tip: "Session IDs let you build multi-user chatbots. Store sessions in Redis for production.",
  },
  {
    week: 1, day: "Day 5–6", title: "RAG — Retrieval Augmented Generation",
    accent: "#dc2626", bg: "#fff1f2",
    concepts: ["Document loaders", "Text splitters", "Embeddings", "VectorStores (FAISS/Chroma)", "Retrieval chains"],
    code: `pip install langchain faiss-cpu langchain-community pypdf

from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate

loader   = TextLoader("my_document.txt")
docs     = loader.load()
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks   = splitter.split_documents(docs)

# FREE embeddings via HuggingFace:
# from langchain_community.embeddings import HuggingFaceEmbeddings
# embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
embeddings  = OpenAIEmbeddings()
vectorstore = FAISS.from_documents(chunks, embeddings)
vectorstore.save_local("faiss_index")

retriever   = vectorstore.as_retriever(search_kwargs={"k": 3})
system_prompt = "Use the context to answer. If unsure, say so.\\n\\nContext: {context}"
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt), ("human", "{input}"),
])
llm        = ChatOpenAI(model="gpt-3.5-turbo")
rag_chain  = create_retrieval_chain(retriever,
               create_stuff_documents_chain(llm, prompt))

result = rag_chain.invoke({"input": "What is the main topic?"})
print(result["answer"])`,
    tip: "Use HuggingFace embeddings (free!) + FAISS (local) = zero cost RAG pipeline.",
  },
  {
    week: 1, day: "Day 7", title: "Tools & Agents (Intro)",
    accent: "#b45309", bg: "#fffbeb",
    concepts: ["@tool decorator", "AgentExecutor", "ReAct pattern", "DuckDuckGo search tool"],
    code: `pip install langchain-community duckduckgo-search

from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_react_agent
from langchain.tools import tool
from langchain_community.tools import DuckDuckGoSearchRun
from langchain import hub

@tool
def calculate(expression: str) -> str:
    """Evaluate a math expression like '2 + 2'"""
    try:    return str(eval(expression))
    except: return "Error"

@tool
def word_count(text: str) -> str:
    """Count words in a text string."""
    return f"Word count: {len(text.split())}"

search = DuckDuckGoSearchRun()
tools  = [calculate, word_count, search]
prompt = hub.pull("hwchase17/react")

llm    = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
agent  = create_react_agent(llm, tools, prompt)
runner = AgentExecutor(agent=agent, tools=tools,
                       verbose=True, max_iterations=5)

result = runner.invoke({
    "input": "Search for latest AI news and count the words"
})
print(result["output"])`,
    tip: "Set verbose=True to see the agent's reasoning chain — great for debugging and demos!",
  },
  {
    week: 2, day: "Day 8–9", title: "Advanced Agents & Multi-Tool",
    accent: "#059669", bg: "#ecfdf5",
    concepts: ["OpenAI Function Calling", "create_openai_tools_agent", "Structured tool outputs", "Error handling"],
    code: `from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from pydantic import BaseModel, Field
import requests

class WeatherInput(BaseModel):
    city: str = Field(description="City name to get weather for")

@tool(args_schema=WeatherInput)
def get_weather(city: str) -> str:
    """Get current weather for a city (free, no API key!)."""
    r = requests.get(f"https://wttr.in/{city}?format=3", timeout=5)
    return r.text if r.ok else "Unavailable"

@tool
def summarize_text(text: str) -> str:
    """Summarize a long text into 3 bullet points."""
    return ChatOpenAI(model="gpt-3.5-turbo").predict(
        f"Summarize in 3 bullets:\\n{text}"
    )

tools  = [get_weather, summarize_text]
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant with access to tools."),
    MessagesPlaceholder("chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])
llm      = ChatOpenAI(model="gpt-3.5-turbo-1106", temperature=0)
agent    = create_openai_tools_agent(llm, tools, prompt)
executor = AgentExecutor(agent=agent, tools=tools, verbose=True)

result = executor.invoke({"input": "Weather in Tokyo and summarize it."})
print(result["output"])`,
    tip: "gpt-3.5-turbo-1106 has function calling and is 10x cheaper than GPT-4.",
  },
  {
    week: 2, day: "Day 10–11", title: "LangGraph — Stateful Agents",
    accent: "#7c3aed", bg: "#f5f3ff",
    concepts: ["StateGraph", "Nodes & Edges", "Conditional routing", "Checkpointing (memory)"],
    code: `pip install langgraph

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from typing import TypedDict, Annotated
import operator

class AgentState(TypedDict):
    messages:  Annotated[list, operator.add]
    next_step: str
    data:      dict

llm = ChatOpenAI(model="gpt-3.5-turbo")

def analyze_node(state: AgentState):
    resp = llm.invoke(f"Analyze: {state['messages'][-1]}")
    return {"messages": [resp.content],
            "next_step": "respond" if "simple" in resp.content.lower()
                         else "research"}

def research_node(state: AgentState):
    return {"messages": ["[Research done]"], "next_step": "respond"}

def respond_node(state: AgentState):
    resp = llm.invoke("Give final answer: " + " ".join(state["messages"]))
    return {"messages": [resp.content]}

def route(state: AgentState):
    return state.get("next_step", "respond")

graph = StateGraph(AgentState)
graph.add_node("analyze",  analyze_node)
graph.add_node("research", research_node)
graph.add_node("respond",  respond_node)
graph.set_entry_point("analyze")
graph.add_conditional_edges("analyze", route,
    {"research": "research", "respond": "respond"})
graph.add_edge("research", "respond")
graph.add_edge("respond", END)

app    = graph.compile()
result = app.invoke({"messages": ["Explain RAG"], "next_step": "", "data": {}})
print(result["messages"][-1])`,
    tip: "LangGraph is the future of agentic AI. It gives you full control over agent flow — no black boxes.",
  },
  {
    week: 2, day: "Day 12–14", title: "Production & Portfolio Polish",
    accent: "#0066ff", bg: "#eff4ff",
    concepts: ["Streaming responses", "Callbacks & logging", "LangSmith tracing", "FastAPI integration"],
    code: `pip install fastapi uvicorn langserve

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

app   = FastAPI(title="LangChain API")
llm   = ChatOpenAI(model="gpt-3.5-turbo", streaming=True)
chain = ChatPromptTemplate.from_template(
    "Answer concisely: {question}"
) | llm | StrOutputParser()

@app.get("/chat")
async def chat_stream(question: str):
    async def generate():
        async for chunk in chain.astream({"question": question}):
            yield f"data: {chunk}\\n\\n"
        yield "data: [DONE]\\n\\n"
    return StreamingResponse(generate(), media_type="text/event-stream")

@app.get("/health")
def health():
    return {"status": "ok"}

# Run: uvicorn main:app --reload
# Test: curl "http://localhost:8000/chat?question=What+is+RAG"

# LangSmith tracing — add to .env, zero code changes:
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=ls__your_key
# LANGCHAIN_PROJECT=my-app`,
    tip: "LangSmith free tier gives you 5K traces/month — enough to debug and showcase your projects.",
  },
];

const projectsData = [
  { id: 1, emoji: "📄", name: "DocuMind", subtitle: "PDF Q&A Bot", difficulty: "Beginner", diffColor: "#059669", diffBg: "#ecfdf5", cost: "~$0.01/session", accentBar: "#059669", tech: ["RAG", "FAISS", "PyPDF", "Streamlit"], description: "Upload any PDF and chat with it. Uses local FAISS vector store — no database needed.", structure: `documind/\n├── app.py\n├── rag.py\n├── requirements.txt\n├── .env.example\n└── README.md`, wow: "Drag-and-drop PDF → instant Q&A. Works with research papers, contracts, manuals." },
  { id: 2, emoji: "🤖", name: "AutoResearcher", subtitle: "Web Agent", difficulty: "Intermediate", diffColor: "#b45309", diffBg: "#fffbeb", cost: "~$0.05/query", accentBar: "#b45309", tech: ["Agents", "DuckDuckGo", "LangGraph", "FastAPI"], description: "Give it a topic, it searches the web, synthesizes findings, and writes a structured report.", structure: `auto-researcher/\n├── agent.py\n├── tools.py\n├── api.py\n├── requirements.txt\n└── README.md`, wow: "Autonomous research loop — the agent decides how many searches to run before answering." },
  { id: 3, emoji: "💬", name: "MemoryBot", subtitle: "Persistent Chatbot", difficulty: "Beginner", diffColor: "#059669", diffBg: "#ecfdf5", cost: "~$0.002/msg", accentBar: "#059669", tech: ["Memory", "SQLite", "Streamlit", "Session History"], description: "A chatbot that remembers your conversations across sessions using SQLite for free persistence.", structure: `memorybot/\n├── app.py\n├── memory.py\n├── chain.py\n├── requirements.txt\n└── README.md`, wow: "Restart the app and it still remembers you — no cloud DB required." },
  { id: 4, emoji: "🔍", name: "CodeReviewer", subtitle: "AI Code Analyst", difficulty: "Intermediate", diffColor: "#b45309", diffBg: "#fffbeb", cost: "~$0.02/review", accentBar: "#b45309", tech: ["Custom Tools", "Structured Output", "GitHub API", "Pydantic"], description: "Paste code or give a GitHub URL. Get structured review: bugs, improvements, security issues.", structure: `code-reviewer/\n├── app.py\n├── reviewer.py\n├── schemas.py\n├── github_tool.py\n└── README.md`, wow: "Returns structured JSON: severity levels, line numbers, fix suggestions — not just prose." },
  { id: 5, emoji: "🧠", name: "MultiAgent Planner", subtitle: "LangGraph Boss", difficulty: "Advanced", diffColor: "#dc2626", diffBg: "#fff1f2", cost: "~$0.10/task", accentBar: "#dc2626", tech: ["LangGraph", "Multi-Agent", "Tool Calling", "FastAPI"], description: "A supervisor agent that delegates tasks to specialized sub-agents: researcher, writer, critic.", structure: `multi-agent-planner/\n├── graph.py\n├── agents/\n│   ├── researcher.py\n│   ├── writer.py\n│   └── critic.py\n├── api.py\n└── README.md`, wow: "Watch multiple AI agents collaborate in real-time with a visual graph of their decisions." },
];

const conceptsSnippets = [
  { name: "LCEL (Pipe syntax)", desc: "prompt | llm | parser — compose chains like Unix pipes", icon: "⛓️", deepId: "lcel" },
  { name: "Runnables", desc: "Everything is a Runnable: invoke(), stream(), batch()", icon: "▶️", deepId: "runnables" },
  { name: "PromptTemplates", desc: "Reusable, parameterized prompts with validation", icon: "📝", deepId: "prompts" },
  { name: "Retrievers", desc: "Abstract interface over vector stores for RAG", icon: "🔍", deepId: "retrievers" },
  { name: "Tools + @tool", desc: "Functions the agent can decide to call", icon: "🔧", deepId: "tools" },
  { name: "Agents", desc: "LLM reasoning loop: Think → Act → Observe → Repeat", icon: "🤖", deepId: "agents" },
  { name: "LangGraph", desc: "Build complex stateful multi-agent workflows as graphs", icon: "🕸️", deepId: "langgraph" },
  { name: "Callbacks", desc: "Hook into any step for logging, streaming, tracing", icon: "📡", deepId: "callbacks" },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPTS DEEP-DIVE DATA
// ─────────────────────────────────────────────────────────────────────────────
const conceptsDeep = [
  {
    id: "lcel", icon: "⛓️", title: "LCEL — LangChain Expression Language", subtitle: "The pipe syntax that connects everything", accent: "#0066ff", bg: "#eff4ff", tagline: "Think of it like Unix pipes for AI",
    tldr: "LCEL lets you compose LangChain components using the | operator. Each component is a Runnable — they accept input and return output. Chain them together and you get a full AI pipeline in one readable line.",
    whyItMatters: "Before LCEL, building chains required verbose class instantiation and callback hell. LCEL makes chains readable, composable, and gives you streaming + async for free.",
    analogy: "It's like building with LEGO. Each piece (prompt, LLM, parser) snaps onto the next. The pipe | is the connector. You don't need to know how each brick works internally — just that they fit together.",
    howItWorks: ["Each component implements the Runnable interface", "The | operator calls __or__ and creates a RunnableSequence", "Calling .invoke() executes each step in order, passing output as input to the next", "You get streaming, batching, and async for free on every chain"],
    diagram: [{ label: "PromptTemplate", color: "#0066ff", desc: "Formats your input into a prompt string" }, { label: "ChatOpenAI", color: "#7c3aed", desc: "Sends prompt to LLM, gets response back" }, { label: "StrOutputParser", color: "#059669", desc: "Extracts just the text from the response" }],
    code: `from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

llm    = ChatOpenAI(model="gpt-3.5-turbo")
prompt = ChatPromptTemplate.from_template("Explain {topic} simply.")
parser = StrOutputParser()

# ── The LCEL chain ──────────────────────────────────────
chain = prompt | llm | parser

# Three ways to run it:
result = chain.invoke({"topic": "RAG"})           # sync, one result
stream = chain.stream({"topic": "RAG"})           # streaming generator
batch  = chain.batch([{"topic": "RAG"},           # parallel execution
                      {"topic": "Agents"}])

# Branch & merge with RunnableParallel
from langchain_core.runnables import RunnableParallel

parallel = RunnableParallel(
    summary  = prompt | llm | parser,
    keywords = ChatPromptTemplate.from_template(
        "List 5 keywords for: {topic}"
    ) | llm | parser,
)
result = parallel.invoke({"topic": "RAG"})
# result = {"summary": "...", "keywords": "..."}`,
    gotchas: ["The | operator only works between Runnables — wrap plain functions with RunnableLambda", "Chain order matters: output type of step N must match input type of step N+1", "Use .with_config() to add callbacks, tags, or timeouts to any chain"],
  },
  {
    id: "runnables", icon: "▶️", title: "Runnables", subtitle: "The universal interface for every component", accent: "#7c3aed", bg: "#f5f3ff", tagline: "If it has .invoke(), it's a Runnable",
    tldr: "Runnable is the base interface that every LangChain component implements. Prompts, LLMs, parsers, retrievers, tools — they're all Runnables. This unified interface is what makes LCEL possible.",
    whyItMatters: "A universal interface means you can swap any component without rewriting your chain. Replace OpenAI with Anthropic, swap a parser, inject a custom function — the chain doesn't care.",
    analogy: "Runnables are like USB-C ports. Every device speaks the same interface. You can plug a charger, monitor, or USB stick into the same port. The components are interchangeable because they all speak the same protocol.",
    howItWorks: ["invoke(input) — run synchronously, get one result", "stream(input) — run with streaming, yields chunks as they arrive", "batch(inputs) — run multiple inputs in parallel automatically", "ainvoke / astream / abatch — async versions of all the above"],
    diagram: [{ label: "invoke()", color: "#7c3aed", desc: "Synchronous: one input → one output" }, { label: "stream()", color: "#0066ff", desc: "Streaming: one input → many chunks" }, { label: "batch()", color: "#059669", desc: "Parallel: many inputs → many outputs" }],
    code: `from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-3.5-turbo")

# ── Wrap any function as a Runnable ─────────────────────
def shout(text: str) -> str:
    return text.upper() + "!!!"

shout_r = RunnableLambda(shout)
shout_r.invoke("hello")   # "HELLO!!!"

# ── RunnablePassthrough.assign: inject extra keys ────────
from langchain_core.runnables import RunnablePassthrough
from langchain.prompts import ChatPromptTemplate

chain = (
    RunnablePassthrough.assign(upper=lambda x: x["topic"].upper())
    | ChatPromptTemplate.from_template("Explain {topic}. Key: {upper}")
    | llm
)
chain.invoke({"topic": "rag"})

# ── Stream tokens to console in real time ───────────────
for chunk in (ChatPromptTemplate.from_template("{q}") | llm).stream({"q": "Hi"}):
    print(chunk.content, end="", flush=True)

# ── Batch: 3 calls in parallel ───────────────────────────
results = llm.batch(["What is RAG?", "What is LCEL?", "What is LangGraph?"])`,
    gotchas: ["RunnableLambda wraps any Python function — great for data transforms mid-chain", "Use .with_retry() on any Runnable to add automatic retry logic", "Use .with_fallbacks([other_chain]) to handle failures gracefully"],
  },
  {
    id: "prompts", icon: "📝", title: "PromptTemplates", subtitle: "Reusable, validated prompt blueprints", accent: "#059669", bg: "#ecfdf5", tagline: "Your prompt is code — treat it that way",
    tldr: "PromptTemplates are parameterized prompts. Instead of hardcoding strings, you define a template with {variables} and fill them in at runtime. They validate inputs, support multiple message types, and are composable.",
    whyItMatters: "Hardcoded strings break. Templates let you reuse prompts across your app, test them in isolation, version-control them, and swap variables without touching logic.",
    analogy: "Like a Python f-string, but smarter. It knows which variables are required, supports multi-turn chat format, can be pulled from a remote hub, and validates that you didn't forget to fill in a slot.",
    howItWorks: ["PromptTemplate — for simple string prompts with {variables}", "ChatPromptTemplate — for multi-turn chat with system/human/ai messages", "MessagesPlaceholder — inserts a list of messages (e.g. chat history) at a specific position", "FewShotPromptTemplate — include examples to guide the model output format"],
    diagram: [{ label: "System Message", color: "#059669", desc: "Sets AI persona & instructions" }, { label: "MessagesPlaceholder", color: "#0066ff", desc: "Inserts chat history here" }, { label: "Human Message", color: "#7c3aed", desc: "The user's current question" }],
    code: `from langchain.prompts import (
    ChatPromptTemplate, PromptTemplate,
    FewShotPromptTemplate, MessagesPlaceholder,
)

# ── Basic string prompt ─────────────────────────────────
simple = PromptTemplate.from_template(
    "Summarize in {num_words} words: {text}"
)

# ── Chat prompt: system + human ─────────────────────────
chat = ChatPromptTemplate.from_messages([
    ("system", "You are a {role}. Respond in {language}."),
    ("human", "{question}"),
])
chat.invoke({"role": "pirate", "language": "English",
             "question": "What is RAG?"})

# ── With message history ─────────────────────────────────
with_mem = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful assistant."),
    MessagesPlaceholder("history"),     # ← list of past messages
    ("human", "{input}"),
])

# ── Few-shot: give examples ──────────────────────────────
examples = [
    {"input": "happy",  "output": "sad"},
    {"input": "tall",   "output": "short"},
]
few_shot = FewShotPromptTemplate(
    examples=examples,
    example_prompt=PromptTemplate.from_template(
        "Input: {input}\\nOutput: {output}"
    ),
    suffix="Input: {adjective}\\nOutput:",
    input_variables=["adjective"],
)

# ── Partial: pre-fill some variables ─────────────────────
en_chat = chat.partial(language="English")   # language is fixed
en_chat.invoke({"role": "teacher", "question": "What is LCEL?"})

# ── Pull from LangChain Hub ──────────────────────────────
from langchain import hub
react_prompt = hub.pull("hwchase17/react")`,
    gotchas: ["Always validate your template by calling .format() in a test before wiring into a chain", "MessagesPlaceholder with optional=True won't error if the key is missing", "partial() pre-fills some variables — great for building reusable prompt factories"],
  },
  {
    id: "retrievers", icon: "🔍", title: "Retrievers & RAG", subtitle: "Give your LLM access to your own documents", accent: "#dc2626", bg: "#fff1f2", tagline: "Turn any document into a queryable knowledge base",
    tldr: "RAG (Retrieval Augmented Generation) lets your LLM answer questions about documents it was never trained on. You embed documents as vectors, store them, then retrieve the most relevant chunks at query time and inject them into the prompt.",
    whyItMatters: "LLMs hallucinate when they don't know something. RAG grounds the model in real data — your PDFs, databases, wikis. It's the most practical LangChain skill for building real products.",
    analogy: "Imagine an open-book exam. RAG is the student's ability to quickly flip to the right page before answering. Without it, the student guesses from memory. With it, they find the exact relevant passage and cite it.",
    howItWorks: ["Load: ingest documents from PDFs, websites, databases, etc.", "Split: chunk documents into ~500 token pieces with overlap", "Embed: convert each chunk to a vector (numbers capturing meaning)", "Store: save vectors to a VectorStore (FAISS locally, Pinecone in cloud)", "Retrieve: at query time, find the top-k most similar chunks", "Generate: inject retrieved chunks into the prompt as context"],
    diagram: [{ label: "Load + Split", color: "#dc2626", desc: "PDF/text → overlapping chunks" }, { label: "Embed + Store", color: "#b45309", desc: "Chunks → vectors saved to FAISS" }, { label: "Retrieve + Generate", color: "#7c3aed", desc: "Query → top-k chunks → LLM answer" }],
    code: `from langchain_community.document_loaders import PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings  # FREE
from langchain_community.vectorstores import FAISS
from langchain_openai import ChatOpenAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.prompts import ChatPromptTemplate

# ── Load & split ────────────────────────────────────────
docs     = PyPDFLoader("report.pdf").load()
splitter = RecursiveCharacterTextSplitter(
    chunk_size=500, chunk_overlap=50,
    separators=["\n\n", "\n", " "],
)
chunks   = splitter.split_documents(docs)

# ── Embed (HuggingFace = FREE) ──────────────────────────
embeddings  = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
vectorstore = FAISS.from_documents(chunks, embeddings)
vectorstore.save_local("./faiss_db")

# ── Retrieve ────────────────────────────────────────────
retriever = vectorstore.as_retriever(
    search_type="mmr",            # diverse results
    search_kwargs={"k": 3}
)
docs = retriever.invoke("revenue forecast?")  # test it

# ── RAG chain ───────────────────────────────────────────
prompt = ChatPromptTemplate.from_messages([
    ("system", "Answer ONLY from context. Say 'I don't know' if unsure.\\n\\nContext: {context}"),
    ("human", "{input}"),
])
llm       = ChatOpenAI(model="gpt-3.5-turbo")
rag_chain = create_retrieval_chain(
    retriever,
    create_stuff_documents_chain(llm, prompt)
)
result = rag_chain.invoke({"input": "What is the revenue forecast?"})
print(result["answer"])
print(result["context"])  # ← actual chunks used`,
    gotchas: ["chunk_overlap prevents losing context at chunk boundaries — always set it to ~10% of chunk_size", "MMR retrieval (search_type='mmr') gives more diverse results than pure similarity", "Add metadata (page number, source URL) to Documents so you can cite sources in answers"],
  },
  {
    id: "tools", icon: "🔧", title: "Tools & @tool", subtitle: "Functions the LLM can decide to call", accent: "#b45309", bg: "#fffbeb", tagline: "Turn any Python function into an AI superpower",
    tldr: "Tools are Python functions decorated with @tool that an agent can choose to call. The LLM reads the function's docstring to understand what it does, then decides whether to call it based on the user's request.",
    whyItMatters: "Tools give your LLM agency beyond text generation. It can search the web, run code, read files, call APIs, query databases — anything you can write a Python function for.",
    analogy: "Think of tools as apps on a phone. The AI is the user. When asked 'what's the weather?', it knows to open the Weather app (call get_weather tool) rather than guessing. The docstring is the app name in the launcher.",
    howItWorks: ["Decorate a function with @tool", "The function's docstring becomes the tool description — the LLM reads this to decide when to use it", "Type hints define the input schema — the LLM fills these in when calling", "When the agent calls the tool, LangChain executes the function and returns the result to the agent"],
    diagram: [{ label: "@tool decorator", color: "#b45309", desc: "Registers function with name + schema" }, { label: "Docstring", color: "#dc2626", desc: "LLM reads this to know when to use it" }, { label: "Type hints", color: "#059669", desc: "Defines input schema for structured calling" }],
    code: `from langchain.tools import tool
from pydantic import BaseModel, Field
import requests

# ── Basic tool ──────────────────────────────────────────
@tool
def word_count(text: str) -> str:
    """Count the number of words in a given text string."""
    return f"{len(text.split())} words"

# ── Pydantic schema for complex inputs ──────────────────
class WeatherInput(BaseModel):
    city:  str = Field(description="City name, e.g. 'Tokyo'")
    units: str = Field(default="celsius", description="'celsius' or 'fahrenheit'")

@tool(args_schema=WeatherInput)
def get_weather(city: str, units: str = "celsius") -> str:
    """Get current weather for a city. No API key needed."""
    r = requests.get(f"https://wttr.in/{city}?format=3", timeout=5)
    return r.text if r.ok else "Weather unavailable"

# ── Tool that reads files ────────────────────────────────
@tool
def read_file(filepath: str) -> str:
    """Read and return the full contents of a text file."""
    try:
        with open(filepath) as f:
            return f.read()
    except Exception as e:
        return f"Error: {e}"

# ── Built-in tools ───────────────────────────────────────
from langchain_community.tools import (
    DuckDuckGoSearchRun,   # web search, free
    WikipediaQueryRun,     # Wikipedia
    PythonREPLTool,        # run Python code
)

# ── Inspect a tool ───────────────────────────────────────
print(get_weather.name)         # "get_weather"
print(get_weather.description)  # "Get current weather..."
print(get_weather.args)         # {"city": {...}, "units": {...}}

# ── Test a tool directly ─────────────────────────────────
result = get_weather.invoke({"city": "Tokyo"})`,
    gotchas: ["The docstring is critical — it's exactly what the LLM reads. Be specific about inputs/outputs.", "Never skip error handling in tools — agents can call them with unexpected inputs", "Use args_schema=MyModel for complex inputs; Pydantic validates before execution"],
  },
  {
    id: "agents", icon: "🤖", title: "Agents", subtitle: "LLMs that reason, decide, and act in loops", accent: "#0066ff", bg: "#eff4ff", tagline: "The LLM as a decision-maker, not just a text generator",
    tldr: "An agent is an LLM in a loop. It reads the user's goal, decides which tool to call, calls it, reads the result, and repeats — until it has enough information to give a final answer. The pattern is called ReAct: Reason + Act.",
    whyItMatters: "Chains are deterministic: A→B→C always. Agents are dynamic: the LLM decides the path based on context. This enables open-ended tasks that can't be pre-planned — research, debugging, data analysis.",
    analogy: "A chain is a recipe — fixed steps, fixed order. An agent is a chef who improvises. Given 'make something with these ingredients', the chef checks what's available, decides on a dish, realizes they need more salt, goes to get it, and adapts as they cook.",
    howItWorks: ["User sends a goal (e.g. 'research AI news and summarize')", "Agent (LLM) reasons: 'I need to search the web first'", "Agent calls the search tool with a query string", "Agent reads the search result (observation)", "Agent reasons: 'I have enough info now'", "Agent generates a final answer"],
    diagram: [{ label: "Reason", color: "#0066ff", desc: "LLM thinks: what do I need to do?" }, { label: "Act", color: "#7c3aed", desc: "Call a tool with chosen arguments" }, { label: "Observe", color: "#059669", desc: "Read tool result, update knowledge state" }],
    code: `from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import tool
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_community.tools import DuckDuckGoSearchRun
import requests

@tool
def get_weather(city: str) -> str:
    """Get current weather for a city (no API key needed)."""
    r = requests.get(f"https://wttr.in/{city}?format=3", timeout=5)
    return r.text if r.ok else "Unavailable"

@tool
def calculate(expression: str) -> str:
    """Safely evaluate a math expression like '2 + 2 * 10'."""
    allowed = set("0123456789+-*/()., ")
    if all(c in allowed for c in expression):
        return str(eval(expression))
    return "Invalid expression"

tools  = [get_weather, calculate, DuckDuckGoSearchRun()]
prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI. Use tools when needed."),
    MessagesPlaceholder("chat_history", optional=True),
    ("human", "{input}"),
    MessagesPlaceholder("agent_scratchpad"),
])
llm    = ChatOpenAI(model="gpt-3.5-turbo-1106", temperature=0)
agent  = create_openai_tools_agent(llm, tools, prompt)
runner = AgentExecutor(
    agent=agent, tools=tools,
    verbose=True,       # shows each reasoning step
    max_iterations=5,   # safety limit
    handle_parsing_errors=True,
)

result = runner.invoke({
    "input": "What's the weather in Tokyo? And what's 25 * 4 + 10?"
})
print(result["output"])`,
    gotchas: ["Always set max_iterations — without it, a confused agent can loop forever", "verbose=True is essential for debugging; you see exactly what the agent is thinking", "Use temperature=0 for agents — you want deterministic tool selection, not creative guessing"],
  },
  {
    id: "langgraph", icon: "🕸️", title: "LangGraph", subtitle: "Stateful, controllable multi-agent workflows", accent: "#7c3aed", bg: "#f5f3ff", tagline: "When AgentExecutor isn't enough — build the flow yourself",
    tldr: "LangGraph models your AI workflow as a graph: nodes are functions (LLM calls, tools, logic), edges define transitions. State flows through the graph and persists across nodes. You get full control: loops, branches, human-in-the-loop, multi-agent coordination.",
    whyItMatters: "AgentExecutor is a black box. LangGraph is a white box. You define exactly what happens at each step, enabling complex workflows: parallel agents, supervisor/worker patterns, human approval gates, and stateful multi-turn interactions.",
    analogy: "AgentExecutor is autopilot. LangGraph is a flight plan with manual override. You define the airports (nodes), the routes (edges), and the conditions for diverting (conditional edges). The state of the plane is visible and editable at every stop.",
    howItWorks: ["Define a TypedDict State — the shared memory flowing through all nodes", "Write node functions — they receive state and return partial updates", "Add edges — unconditional (A → B) or conditional (route based on state value)", "Set entry point and compile the graph into a runnable app", "Invoke with initial state — it runs until it hits END"],
    diagram: [{ label: "State (TypedDict)", color: "#7c3aed", desc: "Shared memory passed through every node" }, { label: "Nodes (functions)", color: "#0066ff", desc: "Each step: LLM call, tool call, or logic" }, { label: "Edges (routing)", color: "#059669", desc: "Conditional or fixed transitions between nodes" }],
    code: `pip install langgraph

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_community.tools import DuckDuckGoSearchRun
from typing import TypedDict, Annotated, List
import operator

class ResearchState(TypedDict):
    question:           str
    search_results:     Annotated[List[str], operator.add]
    draft_answer:       str
    needs_more_research: bool
    final_answer:       str

llm    = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
search = DuckDuckGoSearchRun()

def research_node(state: ResearchState):
    result = search.run(state["question"])
    return {"search_results": [result]}

def draft_node(state: ResearchState):
    context  = "\n".join(state["search_results"])
    response = llm.invoke(f"Answer based on:\\n{context}\\n\\nQ: {state['question']}")
    return {"draft_answer": response.content}

def evaluate_node(state: ResearchState):
    r = llm.invoke(f"Is this answer complete? Reply YES or NO only.\\n{state['draft_answer']}")
    return {"needs_more_research": "NO" in r.content.upper()}

def finalize_node(state: ResearchState):
    r = llm.invoke(f"Polish this answer:\\n{state['draft_answer']}")
    return {"final_answer": r.content}

def route(state: ResearchState):
    return "research" if state["needs_more_research"] else "finalize"

graph = StateGraph(ResearchState)
graph.add_node("research", research_node)
graph.add_node("draft",    draft_node)
graph.add_node("evaluate", evaluate_node)
graph.add_node("finalize", finalize_node)
graph.set_entry_point("research")
graph.add_edge("research", "draft")
graph.add_edge("draft",    "evaluate")
graph.add_conditional_edges("evaluate", route,
    {"research": "research", "finalize": "finalize"})
graph.add_edge("finalize", END)

app    = graph.compile()
result = app.invoke({
    "question": "Latest LangChain features 2024?",
    "search_results": [], "draft_answer": "",
    "needs_more_research": False, "final_answer": "",
})
print(result["final_answer"])`,
    gotchas: ["Use Annotated[list, operator.add] for list fields — it appends rather than replaces on updates", "Compile with checkpointer=MemorySaver() to get persistent memory across invocations", "Use interrupt_before=['node_name'] to pause and require human approval before a step runs"],
  },
  {
    id: "callbacks", icon: "📡", title: "Callbacks", subtitle: "Hook into every step for logging, tracing & streaming", accent: "#059669", bg: "#ecfdf5", tagline: "Observe everything. Log anything. Stream in real time.",
    tldr: "Callbacks are event hooks that fire at every step of your chain: when an LLM starts, when it produces a token, when a tool is called, when there's an error. Use them for logging, streaming to a UI, tracking costs, and LangSmith tracing.",
    whyItMatters: "In production, you need observability. Callbacks let you see exactly what your chain is doing, how long each step takes, what tokens were used, and where it fails — without modifying your chain code.",
    analogy: "Like browser DevTools Network tab. You don't change the website, but you can observe every request, response, and timing in real time. Callbacks are the network inspector for your LangChain app.",
    howItWorks: ["Implement BaseCallbackHandler and override the events you care about", "on_llm_start — fires when LLM receives a prompt", "on_llm_new_token — fires for each streaming token (set streaming=True on LLM)", "on_tool_start / on_tool_end — fires when agent calls a tool", "on_chain_error — fires on any exception anywhere in the chain"],
    diagram: [{ label: "on_llm_start", color: "#059669", desc: "Prompt is about to be sent to the LLM" }, { label: "on_llm_new_token", color: "#0066ff", desc: "Each streaming token as it arrives" }, { label: "on_chain_end", color: "#7c3aed", desc: "Final output of the entire chain" }],
    code: `from langchain.callbacks.base import BaseCallbackHandler
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser
import time

class TimingCallback(BaseCallbackHandler):
    def __init__(self):
        self.start = None
        self.tokens = 0

    def on_llm_start(self, serialized, prompts, **kwargs):
        self.start = time.time()
        print(f"🚀 Sending {len(prompts[0])} chars to LLM...")

    def on_llm_new_token(self, token: str, **kwargs):
        self.tokens += 1
        print(token, end="", flush=True)   # real-time streaming

    def on_llm_end(self, response, **kwargs):
        print(f"\\n✅ {time.time()-self.start:.2f}s | ~{self.tokens} tokens")

    def on_llm_error(self, error, **kwargs):
        print(f"❌ Error: {error}")

    def on_tool_start(self, serialized, input_str, **kwargs):
        print(f"🔧 Tool '{serialized['name']}': {input_str[:80]}")

    def on_tool_end(self, output, **kwargs):
        print(f"✓ Result: {output[:80]}")

# ── Attach to LLM (active for all calls) ────────────────
cb  = TimingCallback()
llm = ChatOpenAI(model="gpt-3.5-turbo", streaming=True, callbacks=[cb])
chain = ChatPromptTemplate.from_template("Explain {t}") | llm | StrOutputParser()
chain.invoke({"t": "RAG"})

# ── Or pass per-invocation ───────────────────────────────
chain.invoke({"t": "Agents"}, config={"callbacks": [cb]})

# ── LangSmith: zero-code cloud tracing ──────────────────
# Add to .env file — no code changes needed:
# LANGCHAIN_TRACING_V2=true
# LANGCHAIN_API_KEY=ls__your_key_here
# LANGCHAIN_PROJECT=my-portfolio-app
# → Every chain.invoke() is now traced at smith.langchain.com`,
    gotchas: ["Pass callbacks at LLM init to activate for all calls; pass at invoke() for per-request tracing", "LangSmith is the easiest production tracing setup — just 2 env vars, zero code changes", "Use StdOutCallbackHandler() for instant console debugging of every chain step"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// CODE BLOCK COMPONENT (shared)
// ─────────────────────────────────────────────────────────────────────────────
function CodeBlock({ code, id, copied, onCopy }) {
  return (
    <div style={{ background: "#1e1e2e", borderRadius: 10, overflow: "hidden", border: "1px solid #2d2d42" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#16162a", borderBottom: "1px solid #2d2d42" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {["#ff5f57", "#ffbd2e", "#28c840"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
          <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8, fontFamily: "inherit" }}>python · example.py</span>
        </div>
        <button onClick={() => onCopy(code, id)} style={{ background: copied === id ? "#28c84020" : "#ffffff10", border: `1px solid ${copied === id ? "#28c84055" : "#ffffff20"}`, color: copied === id ? "#28c840" : "#94a3b8", padding: "4px 12px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit", transition: "all 0.15s" }}>
          {copied === id ? "✓ Copied!" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "18px 20px", fontSize: 12.5, lineHeight: 1.8, color: "#cdd6f4", overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>{code}</pre>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONCEPTS DEEP-DIVE PAGE
// ─────────────────────────────────────────────────────────────────────────────
function ConceptsPage({ onBack, initialConcept }) {
  const [active, setActive] = useState(initialConcept || "lcel");
  const [subTab, setSubTab] = useState("explain");
  const [copied, setCopied] = useState(null);
  const cur = conceptsDeep.find(c => c.id === active);

  const copy = (code, id) => { navigator.clipboard.writeText(code); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "0 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 18, marginBottom: 16 }}>
            <button onClick={onBack} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#475569", padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
              ← Back to Roadmap
            </button>
            <div style={{ width: 1, height: 28, background: "#e2e8f0" }} />
            <div style={{ width: 36, height: 36, background: "#0f172a", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧠</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Core Concepts — Deep Dive</h1>
              <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 1 }}>8 Concepts · Explanations · Code · Gotchas</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
            {conceptsDeep.map(c => (
              <button key={c.id} onClick={() => { setActive(c.id); setSubTab("explain"); }} style={{ background: active === c.id ? c.accent : "transparent", color: active === c.id ? "#fff" : "#64748b", border: "none", padding: "8px 14px", cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", fontWeight: 600, borderRadius: "6px 6px 0 0", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }}>
                {c.icon} {c.title.split("—")[0].split(" ").slice(0, 2).join(" ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 40px" }}>
        {/* Hero */}
        <div style={{ ...card, padding: 26, borderTop: `3px solid ${cur.accent}`, marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div style={{ flex: 1, minWidth: 280 }}>
              <div style={{ fontSize: 10.5, color: cur.accent, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 7 }}>Core Concept</div>
              <h2 style={{ margin: "0 0 5px", fontSize: 24, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.4px" }}>{cur.icon} {cur.title}</h2>
              <p style={{ margin: "0 0 14px", fontSize: 14, color: "#64748b", fontWeight: 500 }}>{cur.subtitle}</p>
              <div style={{ background: cur.bg, border: `1.5px solid ${cur.accent}44`, borderRadius: 8, padding: "9px 15px", display: "inline-block" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: cur.accent }}>💡 {cur.tagline}</span>
              </div>
            </div>
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", minWidth: 250 }}>
              <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>Data Flow</div>
              {cur.diagram.map((step, i) => (
                <div key={i}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: step.color, color: "#fff", borderRadius: 6, padding: "4px 10px", fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{step.label}</div>
                    <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.4 }}>{step.desc}</div>
                  </div>
                  {i < cur.diagram.length - 1 && <div style={{ fontSize: 14, color: "#cbd5e1", marginLeft: 16, lineHeight: 1.6 }}>↓</div>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[{ id: "explain", label: "📖 Explanation" }, { id: "howit", label: "⚙️ How It Works" }, { id: "code", label: "💻 Code" }, { id: "gotchas", label: "⚠️ Gotchas" }].map(t => (
            <button key={t.id} onClick={() => setSubTab(t.id)} style={{ background: subTab === t.id ? cur.accent : "#fff", color: subTab === t.id ? "#fff" : "#64748b", border: `1px solid ${subTab === t.id ? cur.accent : "#e2e8f0"}`, padding: "7px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, transition: "all 0.15s" }}>{t.label}</button>
          ))}
        </div>

        {/* Explain */}
        {subTab === "explain" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: cur.bg, color: cur.accent, borderRadius: 5, padding: "2px 8px", fontSize: 10.5 }}>TL;DR</span> What is it?
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "#334155", lineHeight: 1.75 }}>{cur.tldr}</p>
            </div>
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#ecfdf5", color: "#059669", borderRadius: 5, padding: "2px 8px", fontSize: 10.5 }}>WHY</span> Why it matters
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: "#334155", lineHeight: 1.75 }}>{cur.whyItMatters}</p>
            </div>
            <div style={{ ...card, padding: 22, gridColumn: "1 / -1" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#fffbeb", color: "#b45309", borderRadius: 5, padding: "2px 8px", fontSize: 10.5 }}>ANALOGY</span> Mental model
              </h3>
              <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b", borderRadius: 8, padding: "14px 18px" }}>
                <p style={{ margin: 0, fontSize: 13.5, color: "#78350f", lineHeight: 1.8, fontStyle: "italic" }}>"{cur.analogy}"</p>
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        {subTab === "howit" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Step-by-Step</h3>
              {cur.howItWorks.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", paddingBottom: i < cur.howItWorks.length - 1 ? 14 : 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: cur.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>{i + 1}</div>
                    {i < cur.howItWorks.length - 1 && <div style={{ width: 2, flex: 1, background: `${cur.accent}33`, minHeight: 14 }} />}
                  </div>
                  <p style={{ margin: "3px 0 0", fontSize: 13, color: "#334155", lineHeight: 1.65 }}>{step}</p>
                </div>
              ))}
            </div>
            <div style={{ ...card, padding: 22 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Component Flow</h3>
              {cur.diagram.map((step, i) => (
                <div key={i}>
                  <div style={{ background: `${step.color}12`, border: `1.5px solid ${step.color}44`, borderRadius: 9, padding: "13px 15px" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: step.color, marginBottom: 4 }}>{step.label}</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5 }}>{step.desc}</div>
                  </div>
                  {i < cur.diagram.length - 1 && <div style={{ textAlign: "center", fontSize: 16, color: "#cbd5e1", lineHeight: 1.4 }}>↓</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code */}
        {subTab === "code" && (
          <div>
            <div style={{ background: cur.bg, border: `1px solid ${cur.accent}33`, borderLeft: `3px solid ${cur.accent}`, borderRadius: 8, padding: "10px 16px", marginBottom: 14, fontSize: 13, color: cur.accent, fontWeight: 500 }}>
              💡 {cur.tagline}
            </div>
            <CodeBlock code={cur.code} id={cur.id} copied={copied} onCopy={copy} />
          </div>
        )}

        {/* Gotchas */}
        {subTab === "gotchas" && (
          <div style={{ display: "grid", gap: 12 }}>
            {cur.gotchas.map((g, i) => (
              <div key={i} style={{ ...card, padding: 18, display: "flex", gap: 14, alignItems: "flex-start", borderLeft: "4px solid #f59e0b" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fffbeb", border: "1.5px solid #fde68a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⚠️</div>
                <p style={{ margin: 0, fontSize: 13.5, color: "#334155", lineHeight: 1.7 }}>{g}</p>
              </div>
            ))}
            <div style={{ ...card, padding: 18, background: "#f0fdf4", border: "1px solid #bbf7d0", borderLeft: "4px solid #22c55e" }}>
              <p style={{ margin: 0, fontSize: 13, color: "#166534", lineHeight: 1.7 }}>
                <strong>✅ General rule:</strong> Read the LangChain source once for any component you're confused about. The LCEL abstractions are thin — knowing what's underneath removes 90% of the mystery.
              </p>
            </div>
          </div>
        )}

        {/* Bottom nav */}
        <div style={{ marginTop: 20, ...card, padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{conceptsDeep.findIndex(c => c.id === active) + 1} / {conceptsDeep.length}</span>
          <div style={{ display: "flex", gap: 5 }}>
            {conceptsDeep.map(c => (
              <div key={c.id} onClick={() => { setActive(c.id); setSubTab("explain"); }} style={{ width: active === c.id ? 22 : 7, height: 7, borderRadius: 4, background: active === c.id ? cur.accent : "#e2e8f0", cursor: "pointer", transition: "all 0.25s" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { const idx = conceptsDeep.findIndex(c => c.id === active); if (idx > 0) { setActive(conceptsDeep[idx - 1].id); setSubTab("explain"); } }} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>← Prev</button>
            <button onClick={() => { const idx = conceptsDeep.findIndex(c => c.id === active); if (idx < conceptsDeep.length - 1) { setActive(conceptsDeep[idx + 1].id); setSubTab("explain"); } }} style={{ background: cur.accent, border: "none", color: "#fff", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP PAGE
// ─────────────────────────────────────────────────────────────────────────────
function RoadmapPage({ onGoToConcepts }) {
  const [tab, setTab] = useState("concepts");
  const [selDay, setSelDay] = useState(0);
  const [selProject, setSelProject] = useState(null);
  const [copied, setCopied] = useState(null);
  const cur = days[selDay];
  const copy = (code, idx) => { navigator.clipboard.writeText(code); setCopied(idx); setTimeout(() => setCopied(null), 2000); };

  const tabs = [
    { id: "concepts", label: "🧠 Concepts" },
    { id: "roadmap", label: "📅 Roadmap" },
    { id: "projects", label: "🚀 5 Projects" },
    { id: "costguide", label: "💰 Cost Guide" },
  ];

  return (
    <div style={pageWrap}>
      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 40px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, paddingTop: 20, marginBottom: 18 }}>
            <div style={{ width: 42, height: 42, background: "#0066ff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#fff", fontWeight: 900, flexShrink: 0 }}>⛓</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.3px" }}>LangChain Mastery Roadmap</h1>
              <p style={{ margin: 0, fontSize: 10.5, color: "#94a3b8", letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 2 }}>2 Weeks · 5 Portfolio Projects · Agentic AI Dev</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 2 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ background: tab === t.id ? "#0066ff" : "transparent", color: tab === t.id ? "#fff" : "#64748b", border: "none", padding: "9px 18px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600, borderRadius: "6px 6px 0 0", transition: "all 0.15s" }}>{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 40px" }}>

        {/* ── ROADMAP ── */}
        {tab === "roadmap" && (
          <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 20 }}>
            <div>
              {[1, 2].map(wk => (
                <div key={wk} style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "2px", textTransform: "uppercase", padding: "0 10px 8px" }}>Week {wk}</div>
                  {days.filter(d => d.week === wk).map((d) => {
                    const idx = days.indexOf(d); const active = selDay === idx;
                    return (
                      <button key={idx} onClick={() => setSelDay(idx)} style={{ display: "block", width: "100%", textAlign: "left", background: active ? d.bg : "#fff", border: active ? `1.5px solid ${d.accent}55` : "1.5px solid #e2e8f0", borderLeft: `3px solid ${active ? d.accent : "#e2e8f0"}`, padding: "10px 12px", marginBottom: 5, cursor: "pointer", borderRadius: 8, transition: "all 0.15s", fontFamily: "inherit", boxShadow: active ? `0 2px 8px ${d.accent}22` : "none" }}>
                        <div style={{ fontSize: 10, color: active ? d.accent : "#94a3b8", marginBottom: 2, fontWeight: 600 }}>{d.day}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? d.accent : "#334155" }}>{d.title}</div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div>
              <div style={{ ...card, padding: 24, borderTop: `3px solid ${cur.accent}`, marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: cur.accent, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>Week {cur.week} · {cur.day}</div>
                    <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#0f172a" }}>{cur.title}</h2>
                  </div>
                  <div style={{ background: cur.bg, color: cur.accent, border: `1px solid ${cur.accent}44`, borderRadius: 20, padding: "5px 14px", fontSize: 11, fontWeight: 700 }}>{cur.day}</div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {cur.concepts.map((c, i) => (<span key={i} style={{ background: cur.bg, color: cur.accent, border: `1px solid ${cur.accent}44`, borderRadius: 6, padding: "4px 12px", fontSize: 11.5, fontWeight: 600 }}>{c}</span>))}
                </div>
              </div>
              <div style={{ background: "#1e1e2e", borderRadius: 10, overflow: "hidden", border: "1px solid #2d2d42", marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", background: "#16162a", borderBottom: "1px solid #2d2d42" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {["#ff5f57", "#ffbd2e", "#28c840"].map((c, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />)}
                    <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8, fontFamily: "inherit" }}>python · main.py</span>
                  </div>
                  <button onClick={() => copy(cur.code, selDay)} style={{ background: copied === selDay ? "#28c84020" : "#ffffff10", border: `1px solid ${copied === selDay ? "#28c84055" : "#ffffff20"}`, color: copied === selDay ? "#28c840" : "#94a3b8", padding: "4px 12px", borderRadius: 5, cursor: "pointer", fontSize: 11, fontFamily: "inherit", transition: "all 0.15s" }}>{copied === selDay ? "✓ Copied!" : "Copy"}</button>
                </div>
                <pre style={{ margin: 0, padding: "18px 20px", fontSize: 12.5, lineHeight: 1.75, color: "#cdd6f4", overflowX: "auto", maxHeight: 380, overflowY: "auto" }}>{cur.code}</pre>
              </div>
              <div style={{ background: cur.bg, border: `1px solid ${cur.accent}33`, borderLeft: `3px solid ${cur.accent}`, borderRadius: 8, padding: "12px 16px", fontSize: 13, color: cur.accent, display: "flex", gap: 10, marginBottom: 14, fontWeight: 500, lineHeight: 1.6 }}>
                <span>💡</span><span>{cur.tip}</span>
              </div>
              <div style={{ ...card, padding: "13px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{selDay + 1} / {days.length}</span>
                <div style={{ display: "flex", gap: 5 }}>
                  {days.map((d, i) => (<div key={i} onClick={() => setSelDay(i)} style={{ width: i === selDay ? 22 : 7, height: 7, borderRadius: 4, background: i === selDay ? d.accent : i < selDay ? "#bfdbfe" : "#e2e8f0", cursor: "pointer", transition: "all 0.25s" }} />))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setSelDay(Math.max(0, selDay - 1))} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>← Prev</button>
                  <button onClick={() => setSelDay(Math.min(days.length - 1, selDay + 1))} style={{ background: cur.accent, border: "none", color: "#fff", padding: "6px 16px", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 600 }}>Next →</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PROJECTS ── */}
        {tab === "projects" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800, color: "#0f172a" }}>5 Portfolio Projects</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Build all 5 for a complete AI portfolio. Ordered beginner → advanced.</p>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {projectsData.map((p, i) => (
                <div key={i} onClick={() => setSelProject(selProject === i ? null : i)} style={{ ...card, padding: 22, borderLeft: `4px solid ${p.accentBar}`, cursor: "pointer", boxShadow: selProject === i ? "0 4px 16px rgba(0,0,0,0.09)" : "0 1px 4px rgba(0,0,0,0.05)", transition: "box-shadow 0.15s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 22 }}>{p.emoji}</span>
                        <span style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{p.name}</span>
                        <span style={{ fontSize: 13, color: "#64748b" }}>— {p.subtitle}</span>
                        <span style={{ fontSize: 10, background: p.diffBg, color: p.diffColor, border: `1px solid ${p.diffColor}44`, padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>{p.difficulty}</span>
                      </div>
                      <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569", lineHeight: 1.6 }}>{p.description}</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {p.tech.map((t, j) => (<span key={j} style={{ background: "#f1f5f9", border: "1px solid #e2e8f0", borderRadius: 5, padding: "3px 10px", fontSize: 11, color: "#334155", fontWeight: 600 }}>{t}</span>))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: 24, flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 3 }}>API COST</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: p.diffColor }}>{p.cost}</div>
                      <div style={{ fontSize: 18, color: "#94a3b8", marginTop: 10 }}>{selProject === i ? "▲" : "▼"}</div>
                    </div>
                  </div>
                  {selProject === i && (
                    <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>GitHub Structure</div>
                          <pre style={{ background: "#1e1e2e", border: "1px solid #2d2d42", borderRadius: 8, padding: 14, fontSize: 12, color: "#cdd6f4", margin: 0, lineHeight: 1.8 }}>{p.structure}</pre>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10, fontWeight: 700 }}>✨ Wow Factor</div>
                          <div style={{ background: p.diffBg, border: `1px solid ${p.diffColor}33`, borderRadius: 8, padding: 14, fontSize: 13, color: p.diffColor, lineHeight: 1.6, fontWeight: 500, marginBottom: 12 }}>{p.wow}</div>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 14, fontSize: 12, color: "#475569", lineHeight: 2 }}>
                            <strong style={{ color: "#0f172a" }}>README must include:</strong><br />
                            ✓ Architecture diagram<br />✓ Demo GIF / video<br />✓ .env.example file<br />✓ Cost breakdown<br />✓ "How to run" in 3 steps
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONCEPTS ── */}
        {tab === "concepts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
              <div>
                <h2 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800, color: "#0f172a" }}>8 Core Concepts</h2>
                <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Click any concept for a full deep-dive with code, analogies, and gotchas.</p>
              </div>
              <button onClick={() => onGoToConcepts(null)} style={{ background: "#0066ff", border: "none", color: "#fff", padding: "10px 20px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                🧠 Open Deep-Dive →
              </button>
            </div>

            <div style={{ ...card, padding: 20, marginBottom: 14, borderTop: "3px solid #0066ff", background: "#ffffff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontSize: 10, color: "#0066ff", fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>LangChain Framework Overview</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>How the pieces fit together</div>
                  <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                    LangChain helps you build LLM apps by composing <strong>prompts</strong>, <strong>models</strong>, <strong>tools</strong>, and <strong>retrieval</strong> into reliable workflows.
                    The concepts below are the “core primitives” you’ll combine in real projects.
                  </div>
                </div>

                <div style={{ minWidth: 280, flex: 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { k: "Models", v: "ChatLLMs you call (OpenAI/Anthropic/Ollama)" },
                      { k: "Prompts", v: "Reusable templates + message structure" },
                      { k: "LCEL", v: "Compose pipelines: prompt | llm | parser" },
                      { k: "Tools", v: "Functions the model can call" },
                      { k: "RAG", v: "Retrieve context from your data (vector store)" },
                      { k: "Memory", v: "Conversation state + message history" },
                      { k: "LangGraph", v: "Stateful graphs for complex agent flows" },
                      { k: "LangSmith", v: "Tracing, evals, and observability" },
                    ].map((item, i) => (
                      <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a", marginBottom: 3 }}>{item.k}</div>
                        <div style={{ fontSize: 11.5, color: "#64748b", lineHeight: 1.45 }}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              {conceptsSnippets.map((c, i) => (
                <div key={i} onClick={() => onGoToConcepts(c.deepId)} style={{ ...card, padding: 20, display: "flex", gap: 14, alignItems: "flex-start", cursor: "pointer", transition: "box-shadow 0.15s", borderLeft: "3px solid transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,102,255,0.12)"; e.currentTarget.style.borderLeft = "3px solid #0066ff"; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; e.currentTarget.style.borderLeft = "3px solid transparent"; }}>
                  <span style={{ fontSize: 26, flexShrink: 0 }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.6, marginBottom: 8 }}>{c.desc}</div>
                    <span style={{ fontSize: 11, color: "#0066ff", fontWeight: 600 }}>Deep Dive →</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ ...card, padding: 20, background: "#eff4ff", border: "1px solid #bfdbfe", borderLeft: "4px solid #0066ff", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af", marginBottom: 4 }}>🧠 Ready for the full deep-dive?</div>
                <div style={{ fontSize: 13, color: "#3b82f6" }}>Each concept includes: TL;DR · Why it matters · Analogy · Step-by-step · Code · Gotchas</div>
              </div>
              <button onClick={() => onGoToConcepts(null)} style={{ background: "#0066ff", border: "none", color: "#fff", padding: "11px 22px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "inherit", fontWeight: 700, whiteSpace: "nowrap" }}>
                Open Deep-Dive →
              </button>
            </div>
          </div>
        )}

        {/* ── COST GUIDE ── */}
        {tab === "costguide" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: "0 0 6px", fontSize: 21, fontWeight: 800, color: "#0f172a" }}>💰 Low-Cost Learning Strategy</h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>Complete this entire roadmap for under $5 in API costs.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
              {[
                { tier: "🆓 Free Tier", cost: "$0 / month", color: "#059669", items: ["Ollama + Llama 3.2 (local LLM)", "HuggingFace Embeddings", "FAISS vector store (local)", "DuckDuckGo search tool", "LangSmith (5K traces free)", "Groq API (free tier, very fast)"] },
                { tier: "💸 Paid (Optional)", cost: "$2–10 / month", color: "#b45309", items: ["OpenAI gpt-3.5-turbo ($0.001/1K)", "text-embedding-3-small ($0.02/1M)", "Claude Haiku (cheapest + smartest)", "Pinecone free tier (vector DB)", "LangSmith Pro for heavy tracing"] },
              ].map((t, i) => (
                <div key={i} style={{ ...card, padding: 22, borderTop: `3px solid ${t.color}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{t.tier}</h3>
                    <span style={{ fontSize: 15, fontWeight: 800, color: t.color }}>{t.cost}</span>
                  </div>
                  {t.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: j < t.items.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: 13, color: "#475569" }}>
                      <span style={{ color: t.color, fontSize: 8 }}>●</span>{item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={{ ...card, padding: 22, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>🆚 Model Comparison</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ background: "#f8fafc" }}>
                  {["Model", "Cost / 1M tokens", "Speed", "Agent Quality", "Best For"].map((h, i) => (<th key={i} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0" }}>{h}</th>))}
                </tr></thead>
                <tbody>
                  {[["Llama 3.2 (Ollama)", "FREE", "Medium", "⭐⭐⭐", "Learning, local dev"], ["Groq Llama 3.3", "FREE tier", "🚀 Very Fast", "⭐⭐⭐⭐", "RAG & chatbots"], ["GPT-3.5-turbo", "$0.50 / $1.50", "Fast", "⭐⭐⭐⭐", "Production on budget"], ["Claude Haiku", "$0.25 / $1.25", "Fast", "⭐⭐⭐⭐⭐", "Best value for agents"], ["GPT-4o-mini", "$0.15 / $0.60", "Fast", "⭐⭐⭐⭐⭐", "Complex reasoning"]].map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                      {row.map((cell, j) => (<td key={j} style={{ padding: "11px 14px", color: j === 0 ? "#0f172a" : j === 1 ? "#059669" : "#475569", fontWeight: j === 0 ? 700 : 400, borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>{cell}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ background: "#eff4ff", border: "1px solid #bfdbfe", borderLeft: "4px solid #0066ff", borderRadius: 8, padding: "14px 18px", fontSize: 13, color: "#1d4ed8", lineHeight: 1.7, fontWeight: 500 }}>
              <strong>💡 Budget Strategy:</strong> Use Groq (free, blazing fast) during development → switch to Claude Haiku for portfolio demos → all 5 projects for under $3 total in API costs.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT — manages page routing
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState("roadmap");           // "roadmap" | "concepts"
  const [conceptTarget, setConceptTarget] = useState(null);

  const goToConcepts = (conceptId) => {
    setConceptTarget(conceptId);
    setPage("concepts");
  };

  if (page === "concepts") {
    return <ConceptsPage onBack={() => setPage("roadmap")} initialConcept={conceptTarget} />;
  }

  return <RoadmapPage onGoToConcepts={goToConcepts} />;
}
