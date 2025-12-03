from llm.llm_client import call_llm
import json

class AnalystAgent:
    def __init__(self, memory):
        self.memory = memory

    async def run(self, session_id: str, payload: dict):
        data = payload.get('data') or payload.get('from_research') or payload
        prompt = f"You are an analyst. Given this data: {data}, produce structured insights in JSON."
        text = call_llm(prompt)
        try:
            return json.loads(text)
        except Exception:
            return {"analysis": text}
