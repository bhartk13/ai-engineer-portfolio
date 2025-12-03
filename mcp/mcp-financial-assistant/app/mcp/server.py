from typing import Dict, Any
from app.services.account_service import list_accounts, create_account
from app.services.plaid_service import (
    create_link_token, 
    exchange_public_token, 
    get_user_connections,
    sync_accounts_from_plaid
)

def simulate_mcp_server(command: Dict[str, Any], acting_user: str) -> Dict[str, Any]:
    """
    Execute a structured MCP command against the services layer.
    """
    action = command.get("action")
    params = command.get("parameters", {}) or {}

    if action == "SHOW_ACCOUNTS":
        # Smart handler: authenticate via Plaid and show accounts
        # 1. Check if user has Plaid connections
        connections = get_user_connections(acting_user)
        
        if not connections:
            # No connections - need to authenticate first
            result = create_link_token(acting_user)
            if "error" in result:
                return {
                    "status": "error",
                    "type": "TEXT",
                    "message": f"Authentication required. {result['error']}"
                }
            return {
                "status": "success",
                "type": "PLAID_AUTH_REQUIRED",
                "message": "🔐 Authentication Required\n\nTo show your accounts, please connect your bank account first. Click the link below to authenticate via Plaid.",
                "data": result
            }
        
        # 2. User has connections - sync accounts from Plaid
        # Sync from all connections
        synced_any = False
        sync_errors = []
        for conn in connections:
            item_id = conn.get("item_id")
            sync_result = sync_accounts_from_plaid(acting_user, item_id)
            if "error" not in sync_result:
                synced_any = True
            else:
                sync_errors.append(sync_result.get("error", "Unknown error"))
        
        # 3. Get accounts (from Plaid and/or local)
        accounts_result = list_accounts(acting_user, {})
        
        if accounts_result.get("type") == "FINANCIAL_ACCOUNTS":
            message = accounts_result.get("message", "Your accounts:")
            if synced_any:
                message = "✅ Accounts synced from your bank. " + message
            elif sync_errors:
                message = "⚠️ Some accounts may be outdated. " + message
            accounts_result["message"] = message
            return accounts_result
        else:
            # No accounts found
            return {
                "status": "success",
                "type": "TEXT",
                "message": "No accounts found. Please sync your accounts or add accounts manually."
            }

    if action == "LIST_ACCOUNTS":
        return list_accounts(acting_user, params)

    if action == "ADD_ACCOUNT":
        # parameters: name, type, balance, currency (optional)
        return create_account(acting_user, params)

    if action == "PLAID_CREATE_LINK_TOKEN":
        # Create Plaid Link token for OAuth
        result = create_link_token(acting_user)
        if "error" in result:
            return {"status": "error", "type": "TEXT", "message": result["error"]}
        return {
            "status": "success",
            "type": "PLAID_LINK",
            "message": "Plaid Link token created. Use this to initiate OAuth flow.",
            "data": result
        }

    if action == "PLAID_EXCHANGE_TOKEN":
        # Exchange public token for access token
        public_token = params.get("public_token")
        if not public_token:
            return {"status": "error", "type": "TEXT", "message": "public_token parameter required"}
        result = exchange_public_token(public_token, acting_user)
        if "error" in result:
            return {"status": "error", "type": "TEXT", "message": result["error"]}
        return {
            "status": "success",
            "type": "TEXT",
            "message": result.get("message", "Successfully connected to financial institution")
        }

    if action == "PLAID_LIST_CONNECTIONS":
        # List user's Plaid connections
        connections = get_user_connections(acting_user)
        if not connections:
            return {"status": "success", "type": "TEXT", "message": "No Plaid connections found"}
        return {
            "status": "success",
            "type": "PLAID_CONNECTIONS",
            "message": f"Found {len(connections)} connected institution(s)",
            "data": connections
        }

    if action == "PLAID_SYNC_ACCOUNTS":
        # Sync accounts from Plaid
        item_id = params.get("item_id")
        result = sync_accounts_from_plaid(acting_user, item_id)
        if "error" in result:
            return {"status": "error", "type": "TEXT", "message": result["error"]}
        return {
            "status": "success",
            "type": "TEXT",
            "message": result.get("message", "Accounts synced successfully")
        }

    return {"status": "error", "type": "TEXT", "message": f"Unknown action: {action}"}
