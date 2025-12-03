import sqlite3, json

class MemoryStore:
    def __init__(self, db_path='memory.db'):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('''CREATE TABLE IF NOT EXISTS sessions (session_id TEXT PRIMARY KEY, data TEXT)''')
        conn.commit()
        conn.close()

    def create_session(self, session_id: str, initial: dict):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('INSERT OR REPLACE INTO sessions (session_id, data) VALUES (?,?)', (session_id, json.dumps(initial)))
        conn.commit()
        conn.close()

    def get_session(self, session_id: str) -> dict:
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('SELECT data FROM sessions WHERE session_id=?', (session_id,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {}
        return json.loads(row[0])

    def append_session(self, session_id: str, addition: dict):
        current = self.get_session(session_id)
        merged = {**current, **addition}
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('INSERT OR REPLACE INTO sessions (session_id, data) VALUES (?,?)', (session_id, json.dumps(merged)))
        conn.commit()
        conn.close()
