from typing import Dict, Any, List
from app.config import STORAGE_MODE, SQLITE_DB_PATH
from app.utils.formatter import format_currency
from app.utils.id_generator import next_id

# Initialize DB connection when module loads (lazy per storage mode)
DB_CONN = None
MEMORY = None

def _ensure_conn():
    global DB_CONN, MEMORY
    if STORAGE_MODE == "sqlite":
        if DB_CONN is None:
            from app.database.sqlite_manager import init_sqlite
            DB_CONN = init_sqlite(SQLITE_DB_PATH)
    else:
        if MEMORY is None:
            from app.database.memory_manager import MEMORY_DB
            MEMORY = MEMORY_DB

def list_users() -> List[Dict[str, Any]]:
    _ensure_conn()
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("SELECT user_id, profile_json FROM users")
        return [(row["user_id"], __import__("json").loads(row["profile_json"]).get("name")) for row in cur.fetchall()]
    else:
        return [(uid, data["profile"]["name"]) for uid, data in MEMORY["users"].items()]

def get_user_profile(user_id: str):
    _ensure_conn()
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("SELECT profile_json FROM users WHERE user_id=?", (user_id,))
        r = cur.fetchone()
        return __import__("json").loads(r["profile_json"]) if r else None
    else:
        return MEMORY["users"].get(user_id, {}).get("profile")

def get_accounts_for_user(user_id: str):
    _ensure_conn()
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("SELECT id, name, type, balance, currency FROM accounts WHERE user_id=?", (user_id,))
        rows = cur.fetchall()
        return [{key: row[key] for key in row.keys()} for row in rows]
    else:
        return MEMORY["users"].get(user_id, {}).get("accounts", [])

def list_accounts(user_id: str, params: Dict[str, Any]):
    _ensure_conn()
    accounts = get_accounts_for_user(user_id)
    type_filter = params.get("type")
    sort_key = params.get("sort")

    if type_filter:
        accounts = [a for a in accounts if a.get("type") == type_filter]

    if sort_key:
        if sort_key == "balance_high":
            accounts = sorted(accounts, key=lambda x: x["balance"], reverse=True)
        elif sort_key == "balance_low":
            accounts = sorted(accounts, key=lambda x: x["balance"])
        elif sort_key == "name":
            accounts = sorted(accounts, key=lambda x: x["name"])

    formatted = []
    for a in accounts:
        formatted.append({
            "id": a["id"],
            "name": a["name"],
            "type": a["type"],
            "balance": a["balance"],
            "balance_formatted": format_currency(a["balance"], a["currency"]),
            "currency": a["currency"],
            "sign": "Due" if a["balance"] < 0 else "Available"
        })

    if not formatted:
        return {"status": "success", "type": "TEXT", "message": "No accounts found for this user/matching filter."}

    user_profile = get_user_profile(user_id) or {"name": user_id}
    return {"status": "success", "type": "FINANCIAL_ACCOUNTS", "message": f"Found {len(formatted)} accounts for {user_profile.get('name')}.", "data": formatted}

def create_account(user_id: str, params: Dict[str, Any]):
    _ensure_conn()
    name = params.get("name") or params.get("account_name") or "New Account"
    acct_type = params.get("type") or "Deposit"
    balance = float(params.get("balance") or 0.0)
    currency = params.get("currency") or "USD"
    acc_id = next_id()

    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("INSERT INTO accounts (id, user_id, name, type, balance, currency) VALUES (?, ?, ?, ?, ?, ?)",
                    (acc_id, user_id, name, acct_type, balance, currency))
        DB_CONN.commit()
    else:
        MEMORY["users"].setdefault(user_id, {"profile": {"name": user_id}, "accounts": []})
        MEMORY["users"][user_id]["accounts"].append({
            "id": acc_id, "name": name, "type": acct_type, "balance": balance, "currency": currency
        })

    return {"status": "success", "type": "TEXT", "message": f"Account '{name}' created with id {acc_id}."}
