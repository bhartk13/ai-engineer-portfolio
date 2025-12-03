from llm.llm_client import call_llm
import json

class ResearcherAgent:
    def __init__(self, memory):
        self.memory = memory

    async def run(self, session_id: str, payload: dict):
        query = payload.get('query') or payload.get('topic') or ''
        prompt = f"You are a researcher. Collect factual, relevant information for: {query}. Return JSON."
        text = call_llm(prompt)
        try:
            return json.loads(text)
        except Exception:
            return {"raw": text}
