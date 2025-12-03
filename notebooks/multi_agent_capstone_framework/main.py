from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from orchestrator import Orchestrator
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="Multi-Agent Framework")

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

orch = Orchestrator()

class PlanRequest(BaseModel):
    session_id: str
    goal: str

@app.post('/plan')
async def plan(req: PlanRequest):
    result = await orch.handle_goal(req.session_id, req.goal)
    return {"status":"ok","result": result}

@app.get('/session/{session_id}')
def get_session(session_id: str):
    s = orch.memory.get_session(session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    return s

@app.post('/review/{session_id}')
def review(session_id: str, payload: dict):
    return orch.handle_review(session_id, payload)

@app.post('/approve/{session_id}')
def approve(session_id: str):
    return orch.handle_approve(session_id)
