#!/usr/bin/env python3
"""
mcp_fin_accounts_updated.py

Enhanced MCP Simulation:
- Supports SQLite persistent storage (or in-memory mode)
- Loads sample users & accounts on startup
- Allows adding accounts at runtime via console commands
- Supports login simulation (@login user1) and user switching (@user set user2)
- Maintains compatibility with LLM intent interpreter (Gemini) if API_KEY is provided;
  otherwise uses a built-in lightweight parser for LIST_ACCOUNTS and simple add-account commands.
"""

import os
import sqlite3
import json
import requests
import time
from typing import Dict, Any, List, Optional, Tuple

# ===== CONFIG =====
GEMINI_MODEL = "gemini-2.0-flash"
API_KEY = ""  # <-- Place your Gemini API key here if you want live LLM interpretation
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={API_KEY}"

# Choose storage mode via environment variable STORAGE_MODE=sqlite or memory (default)
STORAGE_MODE = os.environ.get("STORAGE_MODE", "sqlite").lower()  # 'sqlite' or 'memory'
SQLITE_DB_PATH = os.environ.get("SQLITE_DB_PATH", "/mnt/data/mcp_fin_accounts.db")

# ===== SAMPLE DATA =====
SAMPLE_USERS = {
    "user1": {
        "profile": {"name": "Alex Johnson"},
        "accounts": [
            {"id": "1001", "name": "Alex Checking", "type": "Deposit", "balance": 4520.75, "currency": "USD"},
            {"id": "2005", "name": "Alex Savings", "type": "Deposit", "balance": 18500.50, "currency": "USD"},
            {"id": "4012", "name": "Alex Visa Rewards", "type": "Credit Card", "balance": -1250.00, "currency": "USD"},
        ],
    },
    "user2": {
        "profile": {"name": "Priya Patel"},
        "accounts": [
            {"id": "3001", "name": "Priya Checking", "type": "Deposit", "balance": 2040.10, "currency": "USD"},
            {"id": "3002", "name": "Priya Brokerage", "type": "Brokerage", "balance": 77200.00, "currency": "USD"},
        ],
    },
    "user3": {
        "profile": {"name": "Kevin Smith"},
        "accounts": [
            {"id": "9001", "name": "Kevin Credit Card", "type": "Credit Card", "balance": -540.34, "currency": "USD"},
            {"id": "9002", "name": "Kevin Savings", "type": "Deposit", "balance": 980.00, "currency": "USD"},
        ],
    },
}

# Default active user
CURRENT_USER = "user1"

# Simple incremental account id generator (string)
def next_account_id(existing_ids: List[str]) -> str:
    # pick a numeric id above max existing + 1 in 4-digit range
    nums = [int(x) for x in existing_ids if x.isdigit()]
    start = max(nums) + 1 if nums else 1000
    return str(start).zfill(4)

# ===== UTILITIES =====
def format_currency(amount: float, currency: str) -> str:
    return f"${abs(amount):,.2f} {currency}"

def exponential_backoff_request(url: str, options: Dict[str, Any], max_retries: int = 5, delay: float = 1.0) -> requests.Response:
    for i in range(max_retries):
        try:
            response = requests.post(url, **options)
            if response.status_code == 429 and i < max_retries - 1:
                time.sleep(delay * (2 ** i))
                continue
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            if i == max_retries - 1:
                raise
            time.sleep(delay * (2 ** i))
    raise Exception("API request failed unexpectedly.")

# ===== PERSISTENCE LAYER =====
def init_sqlite_db(path: str) -> sqlite3.Connection:
    new_db = not os.path.exists(path)
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    if new_db:
        create_tables(conn)
        seed_sample_data_sqlite(conn)
    return conn

def create_tables(conn: sqlite3.Connection):
    cur = conn.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    profile_json TEXT NOT NULL
                   )""")
    cur.execute("""CREATE TABLE IF NOT EXISTS accounts (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    type TEXT NOT NULL,
                    balance REAL NOT NULL,
                    currency TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(user_id)
                   )""")
    conn.commit()

def seed_sample_data_sqlite(conn: sqlite3.Connection):
    cur = conn.cursor()
    for uid, data in SAMPLE_USERS.items():
        cur.execute("INSERT INTO users (user_id, profile_json) VALUES (?, ?)", (uid, json.dumps(data["profile"])))
        for acc in data["accounts"]:
            cur.execute("INSERT INTO accounts (id, user_id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?, ?)",
                        (acc["id"], uid, acc["name"], acc["type"], acc["balance"], acc["currency"]))
    conn.commit()

# Memory DB utilities
FIN_DB = {"users": SAMPLE_USERS.copy()}

def seed_memory_db():
    # deepcopy sample users to avoid mutation of original SAMPLE_USERS constant
    import copy
    FIN_DB["users"] = copy.deepcopy(SAMPLE_USERS)

# Data access: abstracted to work for both SQLite and memory
def list_users() -> List[str]:
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("SELECT user_id, profile_json FROM users")
        return [(row["user_id"], json.loads(row["profile_json"])["name"]) for row in cur.fetchall()]
    else:
        return [(uid, data["profile"]["name"]) for uid, data in FIN_DB["users"].items()]

def get_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("SELECT profile_json FROM users WHERE user_id = ?", (user_id,))
        row = cur.fetchone()
        if not row:
            return None
        return json.loads(row["profile_json"])
    else:
        u = FIN_DB["users"].get(user_id)
        return u["profile"] if u else None

def get_accounts_for_user(user_id: str) -> List[Dict[str, Any]]:
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("SELECT id, name, type, balance, currency FROM accounts WHERE user_id = ?", (user_id,))
        return [dict(row) for row in cur.fetchall()]
    else:
        user = FIN_DB["users"].get(user_id)
        return user["accounts"] if user else []

def add_account_for_user(user_id: str, name: str, acct_type: str, balance: float, currency: str = "USD") -> Dict[str, Any]:
    # Generate ID deterministically
    existing_ids = [a["id"] for a in get_accounts_for_user(user_id)]
    new_id = next_account_id(existing_ids)
    acct = {"id": new_id, "name": name, "type": acct_type, "balance": balance, "currency": currency}
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("INSERT INTO accounts (id, user_id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?, ?)",
                    (acct["id"], user_id, acct["name"], acct["type"], acct["balance"], acct["currency"]))
        DB_CONN.commit()
    else:
        FIN_DB["users"].setdefault(user_id, {"profile": {"name": user_id}, "accounts": []})
        FIN_DB["users"][user_id]["accounts"].append(acct)
    return acct

# ===== LLM INTERPRETER (uses Gemini if API_KEY set, otherwise fallback parser) =====
def interpret_natural_language_command_sync(user_query: str) -> Dict[str, Any]:
    """
    Interpret a natural language command to a structured MCP JSON command.
    If API_KEY is present, tries to call Gemini; otherwise uses a safe local heuristic parser.
    """
    # Simple local heuristics if no API key
    if not API_KEY:
        q = user_query.lower()
        # detect add account pattern
        if q.startswith("add account") or q.startswith("create account") or q.startswith("add a new account"):
            # expected format: add account Name;Type;Balance (e.g. "add account Vacation Savings;Deposit;1200.50")
            parts = user_query.split(" ", 2)
            payload = {"action": "ADD_ACCOUNT", "parameters": {}}
            if len(parts) >= 3:
                rest = parts[2].strip()
                # Allow separators: ; or | or ,
                for sep in [";", "|", ","]:
                    if sep in rest:
                        pieces = [p.strip() for p in rest.split(sep)]
                        break
                else:
                    pieces = rest.split()
                if len(pieces) >= 3:
                    name = pieces[0]
                    acct_type = pieces[1].title()
                    try:
                        balance = float(pieces[2].replace("$", "").replace(",", ""))
                    except Exception:
                        balance = 0.0
                    payload["parameters"] = {"name": name, "type": acct_type, "balance": balance, "currency": "USD"}
            return payload

        if "investment" in q or "brokerage" in q:
            return {"action": "LIST_ACCOUNTS", "parameters": {"type": "Brokerage"}}
        if "checking" in q or "savings" in q or "deposit" in q:
            return {"action": "LIST_ACCOUNTS", "parameters": {"type": "Deposit"}}
        if "credit" in q or "credit card" in q or "debt" in q:
            return {"action": "LIST_ACCOUNTS", "parameters": {"type": "Credit Card"}}
        if "sorted" in q and "balance" in q and ("highest" in q or "highest to lowest" in q or "high to low" in q):
            return {"action": "LIST_ACCOUNTS", "parameters": {"sort": "balance_high"}}
        if "sorted" in q and "balance" in q and ("lowest" in q or "low to high" in q):
            return {"action": "LIST_ACCOUNTS", "parameters": {"sort": "balance_low"}}
        # default to list all accounts
        return {"action": "LIST_ACCOUNTS"}

    # If API key present, attempt to call Gemini (synchronous HTTP)
    system_prompt = """You are a financial command interpreter. Translate the user's request into JSON:
Available action: LIST_ACCOUNTS, ADD_ACCOUNT
Output only JSON object."""
    payload = {
        "contents": [{"parts": [{"text": user_query}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "config": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "action": {"type": "STRING"},
                    "parameters": {"type": "OBJECT"}
                },
                "required": ["action"]
            }
        }
    }
    options = {'headers': {'Content-Type': 'application/json'}, 'data': json.dumps(payload)}
    try:
        resp = exponential_backoff_request(GEMINI_API_URL, options)
        result = resp.json()
        json_text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
        if json_text:
            return json.loads(json_text)
        return {"action": "ERROR", "error": "No JSON from LLM"}
    except Exception as e:
        return {"action": "ERROR", "error": str(e)}

# ===== MCP SERVER SIMULATION =====
def simulate_mcp_server(structured_command: Dict[str, Any], acting_user: str) -> Dict[str, Any]:
    action = structured_command.get("action")
    parameters = structured_command.get("parameters", {}) or {}

    if action == "ERROR":
        return {"status": "error", "type": "TEXT", "message": structured_command.get("error", "Interpretation failed")}

    if action == "LIST_ACCOUNTS":
        accounts = get_accounts_for_user(acting_user)
        type_filter = parameters.get("type")
        sort_key = parameters.get("sort")

        if type_filter:
            accounts = [a for a in accounts if a.get("type") == type_filter]

        if sort_key:
            if sort_key == "balance_high":
                accounts.sort(key=lambda x: x["balance"], reverse=True)
            elif sort_key == "balance_low":
                accounts.sort(key=lambda x: x["balance"])
            elif sort_key == "name":
                accounts.sort(key=lambda x: x["name"])

        account_data = [{
            "name": a["name"],
            "id": a["id"],
            "type": a["type"],
            "balance_formatted": format_currency(a["balance"], a["currency"]),
            "sign": "Due" if a["balance"] < 0 else "Available"
        } for a in accounts]

        if not account_data:
            return {"status": "success", "type": "TEXT", "message": "No accounts found for this user/matching filter."}

        user_profile = get_user_profile(acting_user) or {"name": acting_user}
        return {"status": "success", "type": "FINANCIAL_ACCOUNTS", "data": account_data,
                "message": f"Found {len(account_data)} accounts for {user_profile.get('name', acting_user)}."}

    if action == "ADD_ACCOUNT":
        params = parameters or {}
        name = params.get("name") or params.get("account_name")
        acct_type = params.get("type") or params.get("acct_type") or "Deposit"
        balance = float(params.get("balance") or 0.0)
        currency = params.get("currency") or "USD"
        acct = add_account_for_user(acting_user, name, acct_type, balance, currency)
        return {"status": "success", "type": "TEXT", "message": f"Account created: {acct['name']} ({acct['id']})"}

    return {"status": "error", "type": "TEXT", "message": f"Unknown action: {action}"}

# ===== CONSOLE UI =====
def display_account_list(accounts: List[Dict[str, Any]], title: str):
    print("\n" + "="*50)
    print(f"MCP RESPONSE: {title}")
    print("="*50)
    for acc in accounts:
        status_color = "\033[92m" if acc["sign"] == "Available" else "\033[91m"
        reset_color = "\033[0m"
        print(f"Account: {acc['name']} ({acc['id']})")
        print(f"  Type: {acc['type']}")
        print(f"  Balance: {status_color}{acc['balance_formatted']} ({acc['sign']}){reset_color}")
        print("-"*50)
    print("\n")

def print_help():
    print("""
Available commands (examples):
 - @fintech <natural language request>   -- Use the MCP financial tool (e.g., @fintech list my accounts)
 - @fintech add account Name;Type;Balance -- Add a new account for the active user
 - @login <user_id>                      -- Simulate logging in as a user (e.g., @login user2)
 - @user set <user_id>                   -- Switch the active user context
 - @users                                -- List available users
 - help                                  -- Show this help
 - quit                                  -- Exit
""")

def initialize_storage():
    global DB_CONN
    if STORAGE_MODE == "sqlite":
        print(f"Initializing SQLite DB at: {SQLITE_DB_PATH}")
        os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)
        DB_CONN = init_sqlite_db(SQLITE_DB_PATH)
        print("SQLite DB initialized.")
    else:
        print("Initializing in-memory DB")
        seed_memory_db()

def show_loaded_users():
    print("Loaded users:")
    for uid, name in list_users():
        active_marker = " (active)" if uid == CURRENT_USER else ""
        print(f" - {uid}: {name}{active_marker}")
    print("")

def main_loop():
    global CURRENT_USER
    print("Welcome to the MCP Simulation Console (Enhanced).")
    print(f"Storage mode: {STORAGE_MODE}. Type 'help' for commands.")
    show_loaded_users()
    print_help()

    while True:
        try:
            user_input = input("You: ").strip()
            if not user_input:
                continue
            if user_input.lower() == "quit":
                break
            if user_input.lower() == "help":
                print_help()
                continue

            # List users
            if user_input.lower() == "@users":
                show_loaded_users()
                continue

            # Login simulation: sets CURRENT_USER context and prints confirmation
            if user_input.lower().startswith("@login "):
                parts = user_input.split()
                if len(parts) >= 2:
                    uid = parts[1].strip()
                    if get_user_profile(uid) is not None:
                        CURRENT_USER = uid
                        print(f"Simulated login successful. Active user: {uid}\n")
                    else:
                        print(f"User '{uid}' not found.\n")
                else:
                    print("Usage: @login <user_id>\n")
                continue

            # User switching shorthand
            if user_input.lower().startswith("@user "):
                parts = user_input.split()
                if len(parts) == 3 and parts[1] == "set":
                    new_user = parts[2]
                    if get_user_profile(new_user) is not None:
                        CURRENT_USER = new_user
                        print(f"Active user switched to: {new_user}\n")
                    else:
                        print(f"User '{new_user}' not found.\n")
                else:
                    print("Usage: @user set <user_id>\n")
                continue

            # If starts with @fintech -> interpret via LLM or fallback parser
            if user_input.lower().startswith("@fintech"):
                nl = user_input[len("@fintech"):].strip()
                if not nl:
                    print("Please enter a natural language command after '@fintech'\n")
                    continue
                print("AI: Interpreting command...")
                structured = interpret_natural_language_command_sync(nl)
                print("DEBUG: structured command:", json.dumps(structured))
                resp = simulate_mcp_server(structured, CURRENT_USER)
                if resp.get("type") == "FINANCIAL_ACCOUNTS":
                    display_account_list(resp["data"], resp["message"])
                else:
                    print(f"AI: {resp.get('message')}\n")
                continue

            # Unknown input
            print("AI: Unrecognized command. Type 'help' to see available commands.\n")

        except EOFError:
            break
        except KeyboardInterrupt:
            print("\nInterrupted. Exiting.")
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            break

if __name__ == "__main__":
    DB_CONN = None
    initialize_storage()
    main_loop()
