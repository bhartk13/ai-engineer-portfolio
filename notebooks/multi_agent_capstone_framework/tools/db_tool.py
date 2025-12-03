import sqlite3, json
DB_FILE = 'tool_data.db'

class DBTool:
    def __init__(self, db_path=DB_FILE):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)')
        conn.commit()
        conn.close()

    def write(self, table, data):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        key = f"{table}:{data.get('id','auto')}"
        cur.execute('INSERT OR REPLACE INTO kv (k,v) VALUES (?,?)', (key, json.dumps(data)))
        conn.commit()
        conn.close()
        return {'key': key}

    def read(self, key):
        conn = sqlite3.connect(self.db_path)
        cur = conn.cursor()
        cur.execute('SELECT v FROM kv WHERE k=?', (key,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        return json.loads(row[0])
