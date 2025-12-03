import json
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from app.mcp.interpreter import interpret_nl_command
from app.mcp.server import simulate_mcp_server
from app.services.account_service import list_users, get_user_profile, get_accounts_for_user

CURRENT_USER = "user1"

def print_help():
    print("""
Commands:
 - @fintech <natural language>     : Use the MCP financial tool (e.g., @fintech list my accounts)
 - @fintech add account Name;Type;Balance : Add account (example: @fintech add account Vacation;Deposit;1200)
 - @login <user_id>                : Simulate login as user
 - @user set <user_id>             : Switch active user
 - @users                          : List users
 - help                            : Show help
 - quit                            : Exit
""")

def show_users():
    users = list_users()
    print("Available users:")
    for uid, name in users:
        active = " (active)" if uid == CURRENT_USER else ""
        print(f" - {uid}: {name}{active}")
    print("")

def run_console():
    global CURRENT_USER
    print("MCP Financial Assistant - Console")
    print_help()
    while True:
        try:
            text = input("You: ").strip()
            if not text:
                continue
            if text.lower() == "quit":
                break
            if text.lower() == "help":
                print_help(); continue
            if text.lower() == "@users":
                show_users(); continue
            if text.lower().startswith("@login "):
                uid = text.split(None,1)[1].strip()
                profile = get_user_profile(uid)
                if profile:
                    CURRENT_USER = uid
                    print(f"Logged in as {uid} ({profile.get('name')})\n")
                    print(f"DEBUG: CURRENT_USER is now set to: {CURRENT_USER}\n")
                else:
                    print(f"User {uid} not found\n")
                continue
            if text.lower().startswith("@user "):
                parts = text.split()
                if len(parts) == 3 and parts[1] == "set":
                    uid = parts[2]
                    profile = get_user_profile(uid)
                    if profile:
                        CURRENT_USER = uid
                        print(f"Active user switched to {uid} ({profile.get('name')})\n")
                    else:
                        print(f"User {uid} not found\n")
                else:
                    print("Usage: @user set <user_id>\n")
                continue

            if text.lower().startswith("@fintech"):
                nl = text[len("@fintech"):].strip()
                if not nl:
                    print("Please include a natural language command after @fintech\n"); continue
                print("AI: Interpreting command...")
                cmd = interpret_nl_command(nl)
                print("DEBUG: structured command:", json.dumps(cmd))
                print(f"DEBUG: Using CURRENT_USER: {CURRENT_USER}")
                resp = simulate_mcp_server(cmd, CURRENT_USER)
                if resp.get("type") == "FINANCIAL_ACCOUNTS":
                    # pretty print
                    print("\n" + "="*40)
                    print(resp.get("message"))
                    print("="*40)
                    for a in resp["data"]:
                        sign = "Due" if a["balance"] < 0 else "Available"
                        print(f"{a['name']} ({a['id']}) - {a['type']}")
                        print(f"  Balance: {a['balance_formatted']} ({sign})")
                        print("-"*30)
                    print("\n")
                else:
                    print("AI:", resp.get("message"), "\n")
                continue

            print("Unrecognized command. Type 'help' for options.\n")

        except (EOFError, KeyboardInterrupt):
            print("\nExiting.")
            break
