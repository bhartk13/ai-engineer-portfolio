"""
app.py
=======
A small web UI on top of the OpenAI + MCP demo.

This is deliberately thin: it doesn't add any new MCP concepts beyond what
mcp_client_openai.py already does. It just gives the same agent loop a
browser front end so you can *see* the protocol working — which tools the
server exposed, and exactly which tool calls the model made with which
arguments, turn by turn.

Architecture:
- On startup, this app launches mcp_server.py as a subprocess and keeps a
  single MCP ClientSession alive for the lifetime of the web server (so the
  in-memory notes persist across chat turns, same process = same state).
- POST /api/chat runs one turn of the OpenAI <-> MCP agent loop and returns
  both the assistant's reply and a structured trace of any tool calls, so
  the frontend can render them.
- GET  /api/tools returns the tools discovered from the MCP server, so the
  sidebar can show what the model is able to do.

Run:
    pip install -r requirements.txt
    export OPENAI_API_KEY=sk-...
    uvicorn app:app --reload
Then open http://127.0.0.1:8000
"""

import json
import os
import sys
from contextlib import AsyncExitStack

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from openai import OpenAI
from pydantic import BaseModel

load_dotenv()

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
SYSTEM_PROMPT = (
    "You are a helpful assistant with access to a notes-taking tool via "
    "MCP. Use the tools when the user asks you to create, list, search, or "
    "delete notes. Otherwise answer normally."
)
SERVER_PARAMS = StdioServerParameters(command=sys.executable, args=["mcp_server.py"])

app = FastAPI(title="OpenAI + MCP demo")
openai_client = OpenAI()

# App-level state set up in the startup/shutdown handlers below.
_exit_stack = AsyncExitStack()
_state: dict = {"session": None, "openai_tools": [], "history": []}


def mcp_tool_to_openai_schema(mcp_tool) -> dict:
    return {
        "type": "function",
        "function": {
            "name": mcp_tool.name,
            "description": mcp_tool.description or "",
            "parameters": mcp_tool.inputSchema,
        },
    }


@app.on_event("startup")
async def startup():
    # Spawn mcp_server.py once and keep the MCP session open for as long as
    # the web app runs, so notes persist across chat turns.
    read, write = await _exit_stack.enter_async_context(stdio_client(SERVER_PARAMS))
    session = await _exit_stack.enter_async_context(ClientSession(read, write))
    await session.initialize()

    tools_result = await session.list_tools()
    _state["session"] = session
    _state["openai_tools"] = [mcp_tool_to_openai_schema(t) for t in tools_result.tools]
    _state["history"] = [{"role": "system", "content": SYSTEM_PROMPT}]


@app.on_event("shutdown")
async def shutdown():
    await _exit_stack.aclose()


class ChatRequest(BaseModel):
    message: str


@app.get("/api/tools")
async def get_tools():
    return {
        "tools": [
            {
                "name": t["function"]["name"],
                "description": t["function"]["description"],
                "parameters": t["function"]["parameters"],
            }
            for t in _state["openai_tools"]
        ]
    }


@app.post("/api/reset")
async def reset():
    _state["history"] = [{"role": "system", "content": SYSTEM_PROMPT}]
    return {"ok": True}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    session: ClientSession = _state["session"]
    messages = _state["history"]
    messages.append({"role": "user", "content": req.message})

    events = []  # trace of MCP tool calls made during this turn, for the UI

    for _ in range(6):  # safety cap on tool-call rounds
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            tools=_state["openai_tools"],
        )
        choice = response.choices[0]
        messages.append(choice.message.model_dump(exclude_none=True))

        if choice.finish_reason != "tool_calls":
            return {"reply": choice.message.content or "", "events": events}

        for tool_call in choice.message.tool_calls:
            name = tool_call.function.name
            args = json.loads(tool_call.function.arguments or "{}")

            result = await session.call_tool(name, args)
            result_text = "\n".join(
                block.text for block in result.content if hasattr(block, "text")
            )

            events.append({"tool": name, "args": args, "result": result_text})
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result_text,
                }
            )

    return {"reply": "[stopped after too many tool-call rounds]", "events": events}


# Serve the frontend (static/index.html + any assets under static/).
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def index():
    return FileResponse("static/index.html")
