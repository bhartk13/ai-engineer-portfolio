# OpenAI + MCP Demo

A minimal, runnable example of wiring an OpenAI model to a tool server via
the **Model Context Protocol (MCP)** — with both a terminal client and a
web UI built on the same shared client code.

## Project structure

```
openai-mcp-demo/
├── server/
│   └── notes_server.py     MCP SERVER — exposes a notes app as MCP tools/resources
├── client/
│   ├── config.py            shared config: model name, system prompt, server launch params
│   ├── schema.py             converts MCP tool defs -> OpenAI function-calling schema
│   └── agent.py               MCPOpenAIAgent — the actual client / agent loop
├── cli.py                    terminal entrypoint (thin wrapper around client/agent.py)
├── web/
│   ├── app.py                 FastAPI entrypoint (thin wrapper around client/agent.py)
│   └── static/index.html       browser chat UI
├── requirements.txt
└── .env.example
```

The split is deliberate: `server/` knows nothing about OpenAI or chat
loops. `client/agent.py` knows nothing about terminals or HTTP — it's pure
"talk to MCP, talk to OpenAI" logic. `cli.py` and `web/app.py` are both
just thin frontends around that same `MCPOpenAIAgent` class, which is the
point — one client implementation, two ways of driving it.

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
agent, etc. — with zero changes to the server. `server/notes_server.py` in
this repo has no idea OpenAI exists; it just declares tools with typed
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
provider-specific piece: swap OpenAI for another model, and only
`client/agent.py` (the "talk to the LLM" logic) changes — `server/` and
both frontends stay untouched. That reuse is the core value of separating
server, client, and UI.

## How this demo wires them together

```
User → cli.py or web/app.py → client/agent.py (MCPOpenAIAgent)
                                     │
                    ┌────────────────┴────────────────┐
                    ▼                                  ▼
         OpenAI Chat Completions              MCP ClientSession
      (decides: answer, or call a tool?)      → server/notes_server.py
                    │                                  │
                    └──────── tool result fed back ────┘
                                     │
                                     ▼
                             Assistant reply
```

1. The entrypoint (`cli.py` or `web/app.py`) launches
   `server/notes_server.py` as a subprocess and opens an MCP session over
   stdio.
2. `MCPOpenAIAgent.discover_tools()` calls `session.list_tools()` to find
   `add_note`, `list_notes`, `search_notes`, `delete_note`, and converts
   each into an OpenAI `{"type": "function", ...}` schema via
   `client/schema.py`.
3. `MCPOpenAIAgent.run_turn()` sends the conversation plus those tool
   schemas to `chat.completions.create(...)`.
4. If the model responds with `tool_calls`, the agent executes each one
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
python cli.py
```

**Option B — web UI:**

```bash
python -m uvicorn web.app:app --reload
```

(Use `python -m uvicorn ...` rather than the bare `uvicorn` command — it
ensures the project root is on `sys.path` so `web/app.py` can import
`client/`.)

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

## Running the MCP server standalone

`server/notes_server.py` doesn't need OpenAI, `cli.py`, or `web/app.py` at
all — it's a self-contained MCP server, and you can run or inspect it on
its own:

```bash
python server/notes_server.py
```

This starts the server and blocks, waiting for a client to speak MCP
(JSON-RPC over stdin/stdout). You won't see any output — that's expected,
this is a protocol endpoint, not a REPL. It's what `cli.py` and
`web/app.py` do automatically for you when they launch it as a subprocess.

To actually *interact* with the server standalone — call its tools by
hand, inspect its schemas, without writing any client code — use the
official MCP Inspector (requires Node.js):

```bash
npx @modelcontextprotocol/inspector python server/notes_server.py
```

This opens a browser UI where you can list tools/resources and call
`add_note`, `list_notes`, etc. directly, which is a good way to confirm
the server works correctly *before* wiring an LLM client to it.

## Extending this

- Add more tools to `server/notes_server.py` (e.g. wrap a real API or
  database) — no client changes needed beyond what's already generic.
- Swap the transport from stdio to HTTP/SSE (`mcp.server.fastmcp` supports
  this) to run the server remotely instead of as a local subprocess —
  update `client/config.py`'s `SERVER_PARAMS` accordingly.
- Point a *different* client (e.g. Claude Desktop's MCP config, or
  Anthropic's Messages API with MCP connector support) at the same
  `server/notes_server.py` to see the "write once, use anywhere" property
  in practice.
