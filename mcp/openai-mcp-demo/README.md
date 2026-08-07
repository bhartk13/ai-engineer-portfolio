# OpenAI + MCP Demo

A minimal, runnable example of wiring an OpenAI model to a tool server via
the **Model Context Protocol (MCP)**.

## Files

| File | Role |
|---|---|
| `mcp_server.py` | MCP **server**. Exposes a tiny notes app as MCP tools/resources. |
| `mcp_client_openai.py` | MCP **client** (terminal version). Connects to the server, bridges its tools into OpenAI's function-calling API, and runs a chat loop in the console. |
| `app.py` | MCP **client** (web version). Same agent loop as above, wrapped in a FastAPI server with `/api/chat` and `/api/tools` endpoints. |
| `static/index.html` | Browser chat UI that talks to `app.py`. Shows the discovered tools in a sidebar and an expandable trace of every MCP tool call under each assistant reply. |
| `requirements.txt` | Dependencies (`mcp`, `openai`, `python-dotenv`, `fastapi`, `uvicorn`). |
| `.env.example` | Copy to `.env` and add your `OPENAI_API_KEY`. |

## What is MCP?

MCP (Model Context Protocol) is an open, JSON-RPC-based protocol for
connecting LLM applications to external tools, data, and prompts. It
defines three primitives:

- **Tools** — functions the model can call (e.g. `add_note`, `search_notes`).
- **Resources** — data the model/client can read directly (e.g. `notes://all`).
- **Prompts** — reusable prompt templates a server can offer.

MCP separates two concerns that used to be tangled together: *building a
capability* (a server) and *connecting a specific LLM to that capability*
(a client). Anthropic introduced MCP in November 2024, and OpenAI added
native support for MCP servers to its Agents SDK and Responses API in
2025, so the protocol works across providers, not just Claude.

## Why an MCP server?

Before MCP, every tool integration was bespoke: an app that wanted an LLM
to query a database, call an API, or manage files had to hand-write
function-calling glue *for each LLM provider it supported*, and that glue
lived inside the app.

An MCP server flips this: you implement a capability **once**, as a
standalone process that speaks a standard protocol, and it becomes usable
by *any* MCP-compatible client — Claude Desktop, an IDE, a custom OpenAI
agent, etc. — with zero changes to the server. `mcp_server.py` in this
repo has no idea OpenAI exists; it just declares tools with typed
arguments and descriptions, and MCP handles discovery and invocation.

Concretely, a server buys you:

- **Reusability** — write the notes/DB/API integration once, use it from
  any client or model.
- **Isolation** — the server can run as its own process (even on a
  different machine over HTTP/SSE), with its own permissions and secrets,
  separate from the LLM application.
- **Self-describing tools** — the server publishes JSON Schema for each
  tool's arguments, so clients (and models) know how to call it correctly
  without hardcoded documentation.

## Why an MCP client?

The client is the piece that actually talks to both sides:

- **To the server**, over MCP: it opens a session, lists available
  tools/resources, and invokes tools with arguments, all via the MCP
  protocol (here, over stdio — the server runs as a subprocess).
- **To the model**, over that provider's native API: it converts MCP tool
  definitions into the schema the model expects (OpenAI's `tools` array
  in this case), sends the conversation, and when the model responds with
  a tool call, executes it through the MCP session and feeds the result
  back.

Without a client, an MCP server is just an idle process — nothing invokes
it or gets its output in front of a model. The client is also the
provider-specific piece: swapping OpenAI for another model means rewriting
`mcp_client_openai.py`'s "talk to the LLM" logic, but `mcp_server.py`
stays untouched. That reuse is the core value of separating server and
client.

## How this demo wires them together

```
User → mcp_client_openai.py → OpenAI (decides: answer, or call a tool?)
                             ↘ (if tool call) MCP session → mcp_server.py
                                                          ↘ tool result
                             ↙ result fed back to OpenAI as a "tool" message
Assistant reply ←──────────┘
```

1. The client launches `mcp_server.py` as a subprocess and opens an MCP
   session over stdio.
2. It calls `session.list_tools()` to discover `add_note`, `list_notes`,
   `search_notes`, `delete_note`, then converts each into an OpenAI
   `{"type": "function", ...}` schema.
3. It sends the user's message plus those tool schemas to
   `chat.completions.create(...)`.
4. If the model responds with `tool_calls`, the client executes each one
   via `session.call_tool(name, args)` against the MCP server, and appends
   the result as a `role: tool` message.
5. It loops until the model returns a normal (non-tool-call) response.

## Running it

```bash
cd openai-mcp-demo
pip install -r requirements.txt
cp .env.example .env   # then edit .env with your real OPENAI_API_KEY
```

**Option A — terminal chat:**

```bash
python mcp_client_openai.py
```

**Option B — web UI:**

```bash
uvicorn app:app --reload
```

Then open http://127.0.0.1:8000. The sidebar lists the tools discovered
from the MCP server; each assistant reply that used a tool shows an
expandable "N MCP tool calls" trace with the exact tool name, arguments,
and result — so you can watch the MCP protocol working, not just the final
answer.

Try prompts like:

- "Add a note titled 'Groceries' with content 'milk, eggs, bread'."
- "List my notes."
- "Search my notes for eggs."
- "Delete note 1."

## Extending this

- Add more tools to `mcp_server.py` (e.g. wrap a real API or database) —
  no client changes needed beyond what's already generic.
- Swap the transport from stdio to HTTP/SSE (`mcp.server.fastmcp` supports
  this) to run the server remotely instead of as a local subprocess.
- Point a *different* client (e.g. Claude Desktop's MCP config, or
  Anthropic's Messages API with MCP connector support) at the same
  `mcp_server.py` to see the "write once, use anywhere" property in
  practice.
