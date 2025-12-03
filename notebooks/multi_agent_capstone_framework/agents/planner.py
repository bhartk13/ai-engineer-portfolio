import json
from llm.llm_client import call_llm

class PlannerAgent:
    def __init__(self, memory):
        self.memory = memory

    async def create_plan(self, session_id: str, goal: str):
        prompt = f"""You are a planner. Given the user goal, break it into ordered steps. Output JSON: {{ "steps": [ {{ "id": "s1", "role": "...",input": {{}} }} ] }}
User goal: {goal}
"""
        text = call_llm(prompt)
        try:
            plan = json.loads(text)
        except Exception:
            plan = {"steps": [{"id": "s1", "role": "research", "input": {"query": goal}}, {"id": "s2", "role": "analyze", "input": {}}]}
        return plan
