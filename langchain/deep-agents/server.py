"""FastAPI server for the Deep Agents React UI."""

from __future__ import annotations

import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from agent import WORKSPACE_ROOT
from services.agent_service import stream_agent_events
from services.project_data import (
    clear_workspace,
    list_skills,
    list_workspace_files,
    read_agents_md,
    read_workspace_file,
)
from services.run_history import get_run, list_runs

load_dotenv()
os.makedirs(WORKSPACE_ROOT, exist_ok=True)
os.makedirs(os.getenv("RUNS_ROOT", "./runs"), exist_ok=True)

app = FastAPI(title="Deep Agents API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    prompt: str


@app.get("/api/health")
def health():
    provider = os.getenv("LLM_PROVIDER", "auto")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if provider == "anthropic" or (
        provider == "auto"
        and os.getenv("ANTHROPIC_API_KEY")
        and not os.getenv("OPENAI_API_KEY")
    ):
        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    elif provider != "anthropic" and os.getenv("OPENAI_API_KEY"):
        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    return {"status": "ok", "llm_provider": provider, "model": model}


@app.get("/api/skills")
def skills():
    return {"skills": list_skills()}


@app.get("/api/agents-md")
def agents_md():
    return {"content": read_agents_md()}


@app.get("/api/workspace")
def workspace():
    return {"files": list_workspace_files()}


@app.get("/api/workspace/{file_path:path}")
def workspace_file(file_path: str):
    try:
        return {"path": file_path, "content": read_workspace_file(file_path)}
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.delete("/api/workspace")
def delete_workspace():
    return {"removed": clear_workspace()}


@app.get("/api/runs")
def runs(limit: int = 20):
    return {"runs": list_runs(limit=limit)}


@app.get("/api/runs/{run_id}")
def run_detail(run_id: str):
    try:
        return get_run(run_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/chat")
def chat(request: ChatRequest):
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    return StreamingResponse(
        stream_agent_events(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.isdir(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
