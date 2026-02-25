import os
import sqlite3
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root
DB_PATH = os.path.join(BASE_DIR, "data", "commcoach.db")
AUDIO_DIR = os.path.join(BASE_DIR, "data", "audio")

SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  prompt TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration_sec REAL NOT NULL,
  wpm REAL NOT NULL,
  fillers_per_min REAL NOT NULL,
  avg_sentence_len REAL NOT NULL,
  repetition_rate REAL NOT NULL,
  clarity_score REAL NOT NULL,
  structure_score REAL NOT NULL,
  coach_feedback TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS phrases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  phrase TEXT NOT NULL,
  notes TEXT,
  last_reviewed_at TEXT,
  review_interval_days INTEGER NOT NULL DEFAULT 1
);
"""

def connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    os.makedirs(AUDIO_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.execute("PRAGMA foreign_keys = ON;")
    print("Using DB:", DB_PATH)
    return conn

def init_db() -> None:
    conn = connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        conn.close()

def insert_session(row: Dict[str, Any]) -> int:
    conn = connect()
    try:
        cols = ",".join(row.keys())
        qs = ",".join(["?"] * len(row))
        cur = conn.cursor()
        cur.execute(f"INSERT INTO sessions ({cols}) VALUES ({qs})", list(row.values()))
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()

def list_sessions(limit: int = 50) -> List[Tuple]:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, created_at, prompt, duration_sec, wpm, fillers_per_min, clarity_score, structure_score "
            "FROM sessions ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        return cur.fetchall()
    finally:
        conn.close()

def get_session(session_id: int) -> Optional[Dict[str, Any]]:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM sessions WHERE id = ?", (int(session_id),))
        row = cur.fetchone()
        if not row:
            return None
        cols = [d[0] for d in cur.description]
        return dict(zip(cols, row))
    finally:
        conn.close()

def insert_phrase(phrase: str, notes: str = "") -> int:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO phrases (created_at, phrase, notes) VALUES (?, ?, ?)",
            (datetime.utcnow().isoformat(), phrase.strip(), notes.strip()),
        )
        conn.commit()
        return int(cur.lastrowid)
    finally:
        conn.close()

def list_phrases(limit: int = 200) -> List[Tuple]:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT id, created_at, phrase, notes, last_reviewed_at, review_interval_days "
            "FROM phrases ORDER BY id DESC LIMIT ?",
            (limit,),
        )
        return cur.fetchall()
    finally:
        conn.close()

def phrases_due() -> List[Tuple]:
    conn = connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, phrase, notes, last_reviewed_at, review_interval_days
            FROM phrases
            WHERE last_reviewed_at IS NULL
               OR datetime(last_reviewed_at, '+' || review_interval_days || ' days') <= datetime('now')
            ORDER BY COALESCE(last_reviewed_at, created_at) ASC
            LIMIT 20
            """
        )
        return cur.fetchall()
    finally:
        conn.close()

def mark_phrase_reviewed(phrase_id: int, next_interval_days: int) -> None:
    conn = connect()
    try:
        conn.execute(
            "UPDATE phrases SET last_reviewed_at = datetime('now'), review_interval_days = ? WHERE id = ?",
            (int(next_interval_days), int(phrase_id)),
        )
        conn.commit()
    finally:
        conn.close()
