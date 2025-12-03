import asyncio, json
from memory.store import MemoryStore
from agents.planner import PlannerAgent
from agents.researcher import ResearcherAgent
from agents.analyst import AnalystAgent
from agents.executor import ExecutorAgent
from agents.validator import ValidatorAgent
from agents.feedback import FeedbackAgent

class Orchestrator:
    def __init__(self):
        self.memory = MemoryStore('memory.db')
        # generic agents
        self.planner = PlannerAgent(self.memory)
        self.researcher = ResearcherAgent(self.memory)
        self.analyst = AnalystAgent(self.memory)
        self.executor = ExecutorAgent(self.memory)
        self.validator = ValidatorAgent(self.memory)
        self.feedback = FeedbackAgent(self.memory)

    async def handle_goal(self, session_id: str, goal: str):
        # create session
        self.memory.create_session(session_id, {"goal": goal, "status": "in_progress"})
        # 1. ask planner to create steps
        plan = await self.planner.create_plan(session_id, goal)
        self.memory.append_session(session_id, {"plan": plan})

        results = {"steps": []}
        # 2. execute steps sequentially based on planner output
        for step in plan.get('steps', []):
            step_id = step.get('id')
            role = step.get('role')  # 'research','analyze','execute'
            payload = step.get('input', {})
            step_result = {"id": step_id, "role": role}
            if role == 'research':
                out = await self.researcher.run(session_id, payload)
            elif role == 'analyze':
                out = await self.analyst.run(session_id, payload)
            elif role == 'execute':
                out = await self.executor.run(session_id, payload)
            else:
                out = {"error": "unknown role"}
            step_result['output'] = out
            self.memory.append_session(session_id, {f"step_{step_id}": out})
            results['steps'].append(step_result)

        # 3. validate final outputs
        validation = self.validator.validate(session_id, results)
        results['validation'] = validation
        status = "pending_review" if validation.get('requires_human_review') else "complete"
        self.memory.append_session(session_id, {"results": results, "status": status})
        return {"plan": plan, "results": results, "status": status}

    def handle_review(self, session_id: str, payload: dict):
        # store review edits/approval
        session = self.memory.get_session(session_id)
        if not session:
            return {"error": "session not found"}
        self.memory.append_session(session_id, {"review": payload, "status": "reviewed"})
        return {"status": "review_saved"}

    def handle_approve(self, session_id: str):
        session = self.memory.get_session(session_id)
        if not session:
            return {"error": "session not found"}
        final = session.get('review', {}).get('final_output') or session.get('results')
        self.memory.append_session(session_id, {"status": "approved", "final_output": final})
        return {"status":"approved", "final": final}
