import os
import uuid
from datetime import datetime

def now_iso() -> str:
    return datetime.utcnow().isoformat()

def new_audio_path() -> str:
    os.makedirs(os.path.join("data", "audio"), exist_ok=True)
    fname = f"{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.wav"
    return os.path.join("data", "audio", fname)
