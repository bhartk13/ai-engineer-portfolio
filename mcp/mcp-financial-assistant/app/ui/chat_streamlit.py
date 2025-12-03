import os
import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

import streamlit as st
import traceback
from datetime import datetime
from app.mcp.interpreter import interpret_nl_command
from app.mcp.server import simulate_mcp_server
from app.services.account_service import list_users, get_user_profile
from app.services.plaid_service import get_user_connections

# Debug mode - set via environment variable or sidebar
DEBUG_MODE = os.getenv("STREAMLIT_DEBUG", "false").lower() == "true"

def debug_log(message: str):
    """Add a message to debug logs if debug mode is enabled"""
    if st.session_state.get("debug_mode", False):
        timestamp = datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}"
        if "debug_logs" not in st.session_state:
            st.session_state.debug_logs = []
        st.session_state.debug_logs.append(log_entry)
        # Also print to terminal
        print(log_entry)

# Session state
if "messages" not in st.session_state:
    st.session_state.messages = []
if "current_user" not in st.session_state:
    st.session_state.current_user = "user1"
if "debug_mode" not in st.session_state:
    st.session_state.debug_mode = DEBUG_MODE
if "debug_logs" not in st.session_state:
    st.session_state.debug_logs = []

st.title("💬 MCP Financial Assistant")

# Debug toggle in sidebar
with st.sidebar:
    st.session_state.debug_mode = st.checkbox("🐛 Debug Mode", value=st.session_state.debug_mode)
    if st.session_state.debug_mode:
        st.info("Debug mode enabled - check console and expanders below")
        if st.button("Clear Chat"):
            st.session_state.messages = []
            st.rerun()
    
    # Plaid connections section
    st.divider()
    st.subheader("🏦 Bank Connections")
    connections = get_user_connections(st.session_state.current_user)
    if connections:
        for conn in connections:
            st.write(f"**{conn.get('institution_name', 'Unknown')}**")
            st.caption(f"Connected: {conn.get('created_at', 'N/A')}")
    else:
        st.caption("No bank connections")
    
    if st.button("🔄 Sync Accounts"):
        cmd = {"action": "PLAID_SYNC_ACCOUNTS", "parameters": {}}
        resp = simulate_mcp_server(cmd, st.session_state.current_user)
        st.info(resp.get("message", "Syncing..."))
        st.rerun()

# Display current user info
users = list_users()
user_map = {uid: name for uid, name in users}
current_user_name = user_map.get(st.session_state.current_user, st.session_state.current_user)
st.caption(f"Active user: {current_user_name} ({st.session_state.current_user})")

# Debug info panel
if st.session_state.debug_mode:
    with st.expander("🔍 Debug Info", expanded=True):
        col1, col2 = st.columns(2)
        with col1:
            st.json({
                "current_user": st.session_state.current_user,
                "message_count": len(st.session_state.messages),
                "session_state_keys": list(st.session_state.keys())
            })
        with col2:
            st.write("**Debug Logs:**")
            if st.button("Clear Logs"):
                st.session_state.debug_logs = []
                st.rerun()
    
    # Debug console/logs panel
    with st.expander("📝 Debug Console Logs", expanded=True):
        if st.session_state.debug_logs:
            log_text = "\n".join(st.session_state.debug_logs[-50:])  # Show last 50 lines
            st.code(log_text, language="text")
        else:
            st.info("No debug logs yet. Execute a command to see logs here.")

# Chat area
for msg in st.session_state.messages:
    if msg["role"] == "user":
        st.chat_message("user").write(msg["content"])
    else:
        st.chat_message("assistant").markdown(msg["content"])

prompt = st.chat_input("Type @fintech command (e.g., 'list my accounts' or 'add account Vacation;Deposit;1200')...")
if prompt:
    st.session_state.messages.append({"role": "user", "content": prompt})
    if prompt.strip().lower().startswith("@login "):
        # Handle login command
        uid = prompt.split(None, 1)[1].strip() if len(prompt.split()) > 1 else None
        if uid:
            profile = get_user_profile(uid)
            if profile:
                st.session_state.current_user = uid
                user_name = profile.get('name', uid)
                st.session_state.messages.append({
                    "role": "assistant", 
                    "content": f"✅ Logged in as **{user_name}** ({uid})"
                })
            else:
                st.session_state.messages.append({
                    "role": "assistant", 
                    "content": f"❌ User `{uid}` not found"
                })
        else:
            st.session_state.messages.append({
                "role": "assistant", 
                "content": "Usage: `@login <user_id>`\n\nExample: `@login user1`"
            })
    elif prompt.strip().lower().startswith("@fintech"):
        try:
            nl = prompt[len("@fintech"):].strip()
            
            # Add to debug logs
            debug_log(f"User command: {prompt}")
            debug_log(f"Natural language: {nl}")
            
            if st.session_state.debug_mode:
                with st.expander("🔍 Debug: Command Processing", expanded=True):
                    st.write("**Natural Language Input:**", nl)
            
            structured = interpret_nl_command(nl)
            debug_log(f"Structured command: {structured}")
            
            if st.session_state.debug_mode:
                with st.expander("🔍 Debug: Structured Command", expanded=True):
                    st.json(structured)
            
            resp = simulate_mcp_server(structured, st.session_state.current_user)
            debug_log(f"Server response type: {resp.get('type', 'unknown')}")
            debug_log(f"Server response status: {resp.get('status', 'unknown')}")
            
            if st.session_state.debug_mode:
                with st.expander("🔍 Debug: Server Response", expanded=True):
                    st.json(resp)
            
            if resp.get("type") == "FINANCIAL_ACCOUNTS":
                md = f"**{resp.get('message')}**\n\n"
                for a in resp["data"]:
                    md += f"- **{a['name']}** (`{a['id']}`) — {a['type']} — {a['balance_formatted']}\n"
                st.session_state.messages.append({"role": "assistant", "content": md})
            elif resp.get("type") == "PLAID_AUTH_REQUIRED":
                # Handle authentication required response
                link_data = resp.get("data", {})
                link_token = link_data.get("link_token")
                if link_token:
                    md = f"""{resp.get('message')}

**🔗 Connect Your Bank Account**

I need to authenticate you via Plaid to access your accounts.

**Next Steps:**
1. Use the Plaid Link token below to connect your bank
2. Search for your bank (Chase, Bank of America, etc.)
3. Log in with your bank credentials
4. Authorize the connection

**Link Token:** `{link_token[:30]}...` (expires in 4 hours)

**Redirect URI:** `{link_data.get('redirect_uri', 'N/A')}`

⚠️ **Note:** In production, this would open Plaid Link automatically. For now, you can use the Plaid API with this token."""
                    st.session_state.messages.append({"role": "assistant", "content": md})
                    st.session_state.plaid_link_token = link_token
                else:
                    st.session_state.messages.append({"role": "assistant", "content": resp.get("message", "Authentication required")})
            elif resp.get("type") == "PLAID_LINK":
                # Handle Plaid Link token creation
                link_data = resp.get("data", {})
                link_token = link_data.get("link_token")
                if link_token:
                    md = f"""**🔗 Connect Your Bank Account**

I've created a secure link to connect your bank account. 

**Next Steps:**
1. Click the button below to open Plaid Link
2. Search for your bank (Chase, Bank of America, etc.)
3. Log in with your bank credentials
4. Authorize the connection

**Link Token:** `{link_token[:20]}...` (expires in 4 hours)

⚠️ **Note:** This requires Plaid Link integration. In production, you would embed the Plaid Link component here.
For now, you can use the Plaid API directly with this link token."""
                    st.session_state.messages.append({"role": "assistant", "content": md})
                    # Store link token in session for callback handling
                    st.session_state.plaid_link_token = link_token
                else:
                    st.session_state.messages.append({"role": "assistant", "content": resp.get("message", "Failed to create link token")})
            elif resp.get("type") == "PLAID_CONNECTIONS":
                # Display Plaid connections
                connections = resp.get("data", [])
                md = f"**{resp.get('message')}**\n\n"
                for conn in connections:
                    md += f"- **{conn.get('institution_name', 'Unknown')}** (ID: {conn.get('item_id', 'N/A')})\n"
                    md += f"  Connected: {conn.get('created_at', 'N/A')}\n\n"
                st.session_state.messages.append({"role": "assistant", "content": md})
            else:
                # Handle TEXT responses (including account creation)
                st.session_state.messages.append({"role": "assistant", "content": resp.get("message", "Command executed.")})
        except Exception as e:
            error_msg = f"❌ Error: {str(e)}"
            if st.session_state.debug_mode:
                error_msg += f"\n\n**Traceback:**\n```\n{traceback.format_exc()}\n```"
                # Add error to debug logs
                debug_log(f"ERROR: {str(e)}")
                debug_log(f"Traceback:\n{traceback.format_exc()}")
            st.session_state.messages.append({"role": "assistant", "content": error_msg})
            # Also print to console for debugging (terminal)
            print(f"Error processing @fintech command: {e}")
            traceback.print_exc()
    else:
        st.session_state.messages.append({"role": "assistant", "content": "Please start commands with `@fintech` or `@login`. Examples:\n- `@login user1`\n- `@fintech list my accounts`\n- `@fintech add account Vacation;Deposit;1200`"})
    # Force rerun to display new messages
    st.rerun()
