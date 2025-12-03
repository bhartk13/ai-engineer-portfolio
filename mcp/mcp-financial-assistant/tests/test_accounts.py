# Simple smoke tests; run with pytest
from app.services.account_service import list_accounts, create_account, get_accounts_for_user

def test_list_accounts_for_sample_user():
    resp = list_accounts("user1", {})
    assert resp["type"] == "FINANCIAL_ACCOUNTS"
    assert "Found" in resp["message"]

def test_create_account_and_list():
    resp2 = create_account("user1", {"name":"UnitTestAcct","type":"Deposit","balance":123.45})
    assert "created" in resp2["message"].lower() or "created with id" in resp2["message"].lower()
    resp = list_accounts("user1", {})
    assert isinstance(resp["data"], list)
