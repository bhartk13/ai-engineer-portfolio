import os
import sqlite3
import json
from app.config import SQLITE_DB_PATH
from app.database.seeds import SAMPLE_USERS

def init_sqlite(db_path: str = None) -> sqlite3.Connection:
    path = db_path or SQLITE_DB_PATH
    # ensure directory exists
    os.makedirs(os.path.dirname(path), exist_ok=True)
    new_db = not os.path.exists(path)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    _create_tables(conn)
    if new_db:
        _seed(conn)
    return conn

def _create_tables(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            profile_json TEXT NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL NOT NULL,
            currency TEXT NOT NULL,
            plaid_account_id TEXT,
            plaid_item_id TEXT,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS plaid_connections (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            item_id TEXT NOT NULL UNIQUE,
            access_token TEXT NOT NULL,
            institution_id TEXT,
            institution_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_synced_at TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS plaid_link_tokens (
            link_token TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    """)
    conn.commit()

def _seed(conn: sqlite3.Connection):
    cur = conn.cursor()
    for uid, data in SAMPLE_USERS.items():
        cur.execute("INSERT OR REPLACE INTO users (user_id, profile_json) VALUES (?, ?)", (uid, json.dumps(data["profile"])))
        for acc in data["accounts"]:
            cur.execute(
                "INSERT OR REPLACE INTO accounts (id, user_id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?, ?)",
                (acc["id"], uid, acc["name"], acc["type"], acc["balance"], acc["currency"])
            )
    conn.commit()
