from tools.db_tool import DBTool
from tools.calendar_tool import CalendarTool
import asyncio

class ExecutorAgent:
    def __init__(self, memory):
        self.memory = memory
        self.db = DBTool()
        self.cal = CalendarTool()

    async def run(self, session_id: str, payload: dict):
        action = payload.get('action') or payload.get('task') or 'noop'
        if action == 'write_db':
            table = payload.get('table', 'default')
            data = payload.get('data', {})
            res = self.db.write(table, data)
            return {'status': 'db_written', 'result': res}
        if action == 'create_event':
            ev = payload.get('event', {})
            r = self.cal.create_event(session_id, ev)
            return {'status': 'event_created', 'result': r}
        await asyncio.sleep(0.01)
        return {'status': 'noop', 'payload': payload}
