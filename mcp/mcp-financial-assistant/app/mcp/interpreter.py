import json
from openai import OpenAI
from app.config import OPENAI_API_KEY, OPENAI_MODEL

# -------------------------
# FALLBACK PARSER (local)
# -------------------------
def fallback_parse(nl: str):
    nl_l = nl.lower().strip()

    if nl_l.startswith("add account"):
        parts = [p.strip() for p in nl.split(" ", 2)[-1].split(";")]
        params = {}
        if len(parts) > 0: params["name"] = parts[0]
        if len(parts) > 1: params["type"] = parts[1].title()
        if len(parts) > 2:
            try:
                params["balance"] = float(parts[2])
            except:
                params["balance"] = 0.0
        return {"action": "ADD_ACCOUNT", "parameters": params}

    # Show accounts command - triggers smart authentication flow
    if "show" in nl_l and ("account" in nl_l or "accounts" in nl_l or "my" in nl_l):
        return {"action": "SHOW_ACCOUNTS", "parameters": {}}
    
    if "investment" in nl_l or "brokerage" in nl_l:
        return {"action": "LIST_ACCOUNTS", "parameters": {"type": "Brokerage"}}
    if "checking" in nl_l or "savings" in nl_l or "deposit" in nl_l:
        return {"action": "LIST_ACCOUNTS", "parameters": {"type": "Deposit"}}
    if "credit" in nl_l or "credit card" in nl_l or "debt" in nl_l:
        return {"action": "LIST_ACCOUNTS", "parameters": {"type": "Credit Card"}}
    
    # Plaid OAuth commands
    if "connect" in nl_l and ("bank" in nl_l or "plaid" in nl_l or "chase" in nl_l or "bofa" in nl_l or "bank of america" in nl_l):
        return {"action": "PLAID_CREATE_LINK_TOKEN"}
    if "sync" in nl_l and ("plaid" in nl_l or "accounts" in nl_l):
        return {"action": "PLAID_SYNC_ACCOUNTS"}
    if "list" in nl_l and ("connection" in nl_l or "institution" in nl_l):
        return {"action": "PLAID_LIST_CONNECTIONS"}

    return {"action": "LIST_ACCOUNTS"}


# -------------------------
# OPENAI NLP CALL
# -------------------------
def call_openai(prompt: str):
    client = OpenAI(api_key=OPENAI_API_KEY)
    
    system_prompt = """You are an NLP parser for a financial assistant. 
Return ONLY valid JSON with this structure:

{
  "action": "...",
  "parameters": {
      "type": "...",
      "sort": "...",
      "name": "...",
      "balance": number,
      "public_token": "...",
      "item_id": "..."
  }
}

Available actions:
- SHOW_ACCOUNTS: Show user's accounts (auto-authenticates via Plaid if needed)
- LIST_ACCOUNTS: List user's accounts
- ADD_ACCOUNT: Add a new account manually
- PLAID_CREATE_LINK_TOKEN: Start OAuth flow to connect bank (Chase, BofA, etc.)
- PLAID_EXCHANGE_TOKEN: Complete OAuth flow (requires public_token)
- PLAID_LIST_CONNECTIONS: List connected financial institutions
- PLAID_SYNC_ACCOUNTS: Sync accounts from connected institutions

If user says "show my accounts" or similar, use SHOW_ACCOUNTS.
If unsure, use:
{ "action": "LIST_ACCOUNTS" }"""

    try:
        # Try with JSON mode first (for models that support it)
        try:
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
        except Exception:
            # Fallback to regular mode if JSON mode not supported
            response = client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
        
        text = response.choices[0].message.content
        
        # Parse LLM output as JSON
        try:
            return json.loads(text)
        except:
            return fallback_parse(prompt)
    except Exception as e:
        # Network errors, API errors → fallback automatically
        return fallback_parse(prompt)


# -------------------------
# PUBLIC FUNCTION
# -------------------------
def interpret_nl_command(nl: str):
    if not OPENAI_API_KEY:
        return fallback_parse(nl)

    try:
        return call_openai(nl)
    except Exception:
        # Network errors, model errors → fallback automatically
        return fallback_parse(nl)
