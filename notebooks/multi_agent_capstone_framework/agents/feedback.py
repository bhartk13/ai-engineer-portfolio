class FeedbackAgent:
    def __init__(self, memory):
        self.memory = memory

    async def request_feedback(self, session_id: str, payload: dict):
        self.memory.append_session(session_id, {'feedback_requested': True})
        return {'status': 'feedback_requested'}
