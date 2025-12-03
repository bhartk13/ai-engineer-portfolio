import uuid

def next_id() -> str:
    # Short unique id for demo purposes
    return uuid.uuid4().hex[:8]
