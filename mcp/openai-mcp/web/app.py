"""
web/app.py
==========
Web entrypoint for the OpenAI + MCP demo (FastAPI + a static HTML/JS chat
frontend in web/static/).

Like cli.py, this file has no protocol or agent-loop logic of its own —
it's routes only. It spawns server/notes_server.py once at startup, keeps
the MCP session alive for the app's lifetime (so notes persist across chat
turns), wraps it in a client.agent.MCPOpenAIAgent, and calls
agent.run_turn() per request. All the actual client behavior lives in
client/agent.py, shared with cli.py.

Run (from the project root):
    pip install -r requirements.txt
    export OPENAI_API_KEY=sk-...
    python -m uvicorn web.app:app --reload
Then open http://127.0.0.1:8000
"""

from contextlib import AsyncExitStack
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from mcp import ClientSession
from mcp.client.stdio import stdio_client
from pydantic import BaseModel

from client.agent import MCPOpenAIAgent
from client.config import OPENAI_MODEL, SERVER_PARAMS, SYSTEM_PROMPT, get_openai_client

STATIC_DIR = Path(__file__).resolve().parent / "static"

app = FastAPI(title="OpenAI + MCP demo")

# App-level state populated in the startup handler below.
_exit_stack = AsyncExitStack()
_state: dict = {"agent": None}


@app.on_event("startup")
async def startup():
    # Spawn server/notes_server.py once and keep the MCP session open for
    # as long as the web app runs, so notes persist across chat turns.
    read, write = await _exit_stack.enter_async_context(stdio_client(SERVER_PARAMS))
    session = await _exit_stack.enter_async_context(ClientSession(read, write))
    await session.initialize()

    agent = MCPOpenAIAgent(session, get_openai_client(), OPENAI_MODEL, SYSTEM_PROMPT)
    await agent.discover_tools()
    _state["agent"] = agent


@app.on_event("shutdown")
async def shutdown():
    await _exit_stack.aclose()


class ChatRequest(BaseModel):
    message: str


@app.get("/api/tools")
async def get_tools():
    agent: MCPOpenAIAgent = _state["agent"]
    return {
        "tools": [
            {
                "name": t["function"]["name"],
                "description": t["function"]["description"],
                "parameters": t["function"]["parameters"],
            }
            for t in agent.openai_tools
        ]
    }


@app.post("/api/reset")
async def reset():
    _state["agent"].reset_history()
    return {"ok": True}


@app.post("/api/chat")
async def chat(req: ChatRequest):
    agent: MCPOpenAIAgent = _state["agent"]
    reply, events = await agent.run_turn(req.message)
    return {
        "reply": reply,
        "events": [{"tool": e.tool, "args": e.args, "result": e.result} for e in events],
    }


# Serve the frontend (web/static/index.html + any assets alongside it).
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def index():
    return FileResponse(str(STATIC_DIR / "index.html"))
