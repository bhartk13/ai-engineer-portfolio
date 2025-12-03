# Minimal calendar tool (mock)
def create_event(session_id: str, event: dict):
    print(f"[Calendar] create_event for {session_id}: {event}")
    return {'ok': True, 'event': event}

class CalendarTool:
    def create_event(self, session_id: str, event: dict):
        return create_event(session_id, event)
