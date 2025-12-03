from app.mcp.interpreter import interpret_nl_command
from app.mcp.server import simulate_mcp_server

def test_interpret_list_accounts():
    cmd = interpret_nl_command("list my accounts")
    assert cmd["action"] == "LIST_ACCOUNTS"

def test_server_list_accounts_executes():
    cmd = {"action":"LIST_ACCOUNTS"}
    resp = simulate_mcp_server(cmd, "user1")
    assert resp["type"] in ("FINANCIAL_ACCOUNTS", "TEXT")
