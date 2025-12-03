"""
Plaid OAuth service for connecting financial institutions
"""
import os
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
try:
    from plaid.api import plaid_api
    from plaid.configuration import Configuration, Environment
    from plaid.api_client import ApiClient
    PLAID_AVAILABLE = True
except ImportError:
    PLAID_AVAILABLE = False
    plaid_api = None
    Configuration = None
    Environment = None
    ApiClient = None

from app.config import PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV, PLAID_REDIRECT_URI, STORAGE_MODE, SQLITE_DB_PATH

# Initialize Plaid client
plaid_client = None
plaid_init_error = None

if not PLAID_AVAILABLE:
    plaid_init_error = "Plaid Python SDK not installed. Run: pip install plaid-python"
elif not PLAID_CLIENT_ID or not PLAID_SECRET:
    plaid_init_error = "PLAID_CLIENT_ID or PLAID_SECRET not set in config"
else:
    try:
        # Determine environment - Environment is in plaid.configuration, not plaid.api
        # Note: Plaid only has Sandbox and Production environments
        env_map = {
            'SANDBOX': Environment.Sandbox,
            'DEVELOPMENT': Environment.Development,
            'PRODUCTION': Environment.Production
        }
        # Default to Sandbox, also use Sandbox for 'development' since it doesn't exist
        plaid_env = env_map.get(PLAID_ENV.upper(), Environment.Sandbox)
        #if PLAID_ENV.upper() == 'DEVELOPMENT':
        #    plaid_env = Environment.Sandbox  # Use Sandbox for development
        
        configuration = Configuration(host=plaid_env)
        configuration.api_key['clientId'] = PLAID_CLIENT_ID
        configuration.api_key['secret'] = PLAID_SECRET
        plaid_client = plaid_api.PlaidApi(ApiClient(configuration))
    except Exception as e:
        plaid_init_error = f"Failed to initialize Plaid client: {str(e)}"
        plaid_client = None

# Database connection
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

def create_link_token(user_id: str) -> Dict[str, Any]:
    """
    Create a Plaid Link token for OAuth flow
    """
    if not plaid_client:
        error_msg = "Plaid not configured. "
        if plaid_init_error:
            error_msg += plaid_init_error
        else:
            error_msg += "Please set PLAID_CLIENT_ID and PLAID_SECRET environment variables."
        return {"error": error_msg}
    
    _ensure_conn()
    
    try:
        request = {
            'user': {
                'client_user_id': user_id,
            },
            'client_name': "MCP Financial Assistant",
            'products': ['transactions', 'auth'],
            'country_codes': ['US'],
            'language': 'en',
        }
        
        # Only include redirect_uri if it's configured (required for OAuth)
        # For sandbox testing without OAuth, you can omit this
        if PLAID_REDIRECT_URI:
            request['redirect_uri'] = PLAID_REDIRECT_URI
        
        response = plaid_client.link_token_create(request)
        link_token = response['link_token']
        expires_at = datetime.now() + timedelta(hours=4)  # Link tokens expire in 4 hours
        
        # Store link token
        if STORAGE_MODE == "sqlite":
            cur = DB_CONN.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO plaid_link_tokens (link_token, user_id, expires_at)
                VALUES (?, ?, ?)
            """, (link_token, user_id, expires_at))
            DB_CONN.commit()
        else:
            if "plaid_link_tokens" not in MEMORY:
                MEMORY["plaid_link_tokens"] = {}
            MEMORY["plaid_link_tokens"][link_token] = {
                "user_id": user_id,
                "expires_at": expires_at
            }
        
        result = {
            "link_token": link_token,
            "expiration": expires_at.isoformat(),
        }
        if PLAID_REDIRECT_URI:
            result["redirect_uri"] = PLAID_REDIRECT_URI
        return result
    except Exception as e:
        error_str = str(e)
        # Provide helpful error message for OAuth redirect URI issues
        if "redirect" in error_str.lower() or "oauth" in error_str.lower():
            error_msg = f"""Failed to create link token: {error_str}

⚠️ **OAuth Redirect URI Configuration Required**

The redirect URI '{PLAID_REDIRECT_URI}' must be configured in your Plaid Dashboard.

**To fix this:**
1. Go to https://dashboard.plaid.com/team/api
2. Navigate to your API keys section
3. Add the redirect URI: {PLAID_REDIRECT_URI}
4. Save the changes

**Alternative:** For testing without OAuth, you can set PLAID_REDIRECT_URI to an empty string or remove it from the request."""
        else:
            error_msg = f"Failed to create link token: {error_str}"
        return {"error": error_msg}

def exchange_public_token(public_token: str, user_id: str) -> Dict[str, Any]:
    """
    Exchange public token for access token and store connection
    """
    if not plaid_client:
        return {"error": "Plaid not configured"}
    
    _ensure_conn()
    
    try:
        # Exchange public token
        exchange_response = plaid_client.item_public_token_exchange({'public_token': public_token})
        access_token = exchange_response['access_token']
        item_id = exchange_response['item_id']
        
        # Get institution info
        item_response = plaid_client.item_get({'access_token': access_token})
        institution_id = item_response['item']['institution_id']
        
        institution_name = "Unknown Institution"
        if institution_id:
            try:
                inst_response = plaid_client.institutions_get_by_id({
                    'institution_id': institution_id,
                    'country_codes': ['US']
                })
                institution_name = inst_response['institution']['name']
            except:
                pass
        
        # Store connection
        if STORAGE_MODE == "sqlite":
            cur = DB_CONN.cursor()
            cur.execute("""
                INSERT OR REPLACE INTO plaid_connections 
                (id, user_id, item_id, access_token, institution_id, institution_name, created_at, last_synced_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (item_id, user_id, item_id, access_token, institution_id, institution_name, datetime.now(), datetime.now()))
            DB_CONN.commit()
        else:
            if "plaid_connections" not in MEMORY:
                MEMORY["plaid_connections"] = {}
            MEMORY["plaid_connections"][item_id] = {
                "user_id": user_id,
                "item_id": item_id,
                "access_token": access_token,
                "institution_id": institution_id,
                "institution_name": institution_name,
                "created_at": datetime.now(),
                "last_synced_at": datetime.now()
            }
        
        return {
            "success": True,
            "item_id": item_id,
            "institution_name": institution_name,
            "message": f"Successfully connected to {institution_name}"
        }
    except Exception as e:
        return {"error": f"Failed to exchange token: {str(e)}"}

def get_user_connections(user_id: str) -> List[Dict[str, Any]]:
    """
    Get all Plaid connections for a user
    """
    _ensure_conn()
    
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        cur.execute("""
            SELECT id, item_id, institution_id, institution_name, created_at, last_synced_at
            FROM plaid_connections
            WHERE user_id = ?
        """, (user_id,))
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    else:
        connections = []
        if "plaid_connections" in MEMORY:
            for conn in MEMORY["plaid_connections"].values():
                if conn["user_id"] == user_id:
                    connections.append(conn)
        return connections

def get_access_token(user_id: str, item_id: Optional[str] = None) -> Optional[str]:
    """
    Get access token for a user's Plaid connection
    """
    _ensure_conn()
    
    if STORAGE_MODE == "sqlite":
        cur = DB_CONN.cursor()
        if item_id:
            cur.execute("SELECT access_token FROM plaid_connections WHERE user_id = ? AND item_id = ?", (user_id, item_id))
        else:
            cur.execute("SELECT access_token FROM plaid_connections WHERE user_id = ? LIMIT 1", (user_id,))
        row = cur.fetchone()
        return row["access_token"] if row else None
    else:
        if "plaid_connections" in MEMORY:
            for conn in MEMORY["plaid_connections"].values():
                if conn["user_id"] == user_id:
                    if not item_id or conn["item_id"] == item_id:
                        return conn["access_token"]
    return None

def sync_accounts_from_plaid(user_id: str, item_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Sync accounts from Plaid and update local database
    """
    if not plaid_client:
        return {"error": "Plaid not configured"}
    
    access_token = get_access_token(user_id, item_id)
    if not access_token:
        return {"error": "No Plaid connection found for user"}
    
    _ensure_conn()
    
    try:
        # Get accounts from Plaid
        accounts_response = plaid_client.accounts_get({'access_token': access_token})
        accounts = accounts_response['accounts']
        
        # Map Plaid account types to our types
        type_mapping = {
            'depository': 'Deposit',
            'credit': 'Credit Card',
            'investment': 'Brokerage',
            'loan': 'Credit Card',  # Treat loans as credit
            'other': 'Deposit'
        }
        
        synced_count = 0
        
        for plaid_account in accounts:
            account_id = plaid_account['account_id']
            account_name = plaid_account['name']
            # Convert enum to string if needed
            plaid_type = str(plaid_account['type']).lower() if hasattr(plaid_account['type'], 'value') else str(plaid_account['type']).lower()
            account_type = type_mapping.get(plaid_type, 'Deposit')
            balance = plaid_account['balances']['available'] or plaid_account['balances']['current'] or 0.0
            currency = plaid_account['balances']['iso_currency_code'] or 'USD'
            
            # Check if account already exists
            if STORAGE_MODE == "sqlite":
                cur = DB_CONN.cursor()
                cur.execute("SELECT id FROM accounts WHERE plaid_account_id = ? AND user_id = ?", (account_id, user_id))
                existing = cur.fetchone()
                
                if existing:
                    # Update existing account
                    cur.execute("""
                        UPDATE accounts 
                        SET name = ?, type = ?, balance = ?, currency = ?
                        WHERE plaid_account_id = ? AND user_id = ?
                    """, (account_name, account_type, balance, currency, account_id, user_id))
                else:
                    # Insert new account
                    from app.utils.id_generator import next_id
                    acc_id = next_id()
                    cur.execute("""
                        INSERT INTO accounts (id, user_id, name, type, balance, currency, plaid_account_id, plaid_item_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """, (acc_id, user_id, account_name, account_type, balance, currency, account_id, item_id))
                DB_CONN.commit()
                synced_count += 1
        
        # Update last_synced_at
        if STORAGE_MODE == "sqlite":
            cur = DB_CONN.cursor()
            cur.execute("""
                UPDATE plaid_connections 
                SET last_synced_at = ? 
                WHERE user_id = ? AND item_id = ?
            """, (datetime.now(), user_id, item_id or ""))
            DB_CONN.commit()
        
        return {
            "success": True,
            "synced_count": synced_count,
            "message": f"Synced {synced_count} accounts from Plaid"
        }
    except Exception as e:
        return {"error": f"Failed to sync accounts: {str(e)}"}

