import requests
import json
import time
from typing import Dict, Any, List, Optional

# --- CONFIGURATION ---
GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025"
# IMPORTANT: Replace the empty string below with your actual API key
# for the LLM interpretation feature to work.
API_KEY = "" 
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={API_KEY}"

# --- MOCK DATABASE (Simulating Local Financial Schema) ---
MOCK_FINANCIAL_DB = {
    "accounts": [
        {'id': '1001', 'name': 'Checking Account', 'type': 'Deposit', 'balance': 4520.75, 'currency': 'USD'},
        {'id': '2005', 'name': 'Savings Account (High Yield)', 'type': 'Deposit', 'balance': 18500.50, 'currency': 'USD'},
        {'id': '4012', 'name': 'Travel Rewards Visa', 'type': 'Credit Card', 'balance': -1250.00, 'currency': 'USD'},
        {'id': '6033', 'name': 'Investment Portfolio', 'type': 'Brokerage', 'balance': 55900.22, 'currency': 'USD'},
        {'id': '7000', 'name': 'Another Checking', 'type': 'Deposit', 'balance': 100.00, 'currency': 'USD'},
    ],
    "user_profile": {
        "name": 'Alex Johnson',
    }
}

# --- UTILITIES ---

def format_currency(amount: float, currency: str) -> str:
    """Helper function to format currency (simulating Intl.NumberFormat)."""
    # Simple Python currency formatting for console output
    return f"${abs(amount):,.2f} {currency}"

def exponential_backoff_request(url: str, options: Dict[str, Any], max_retries: int = 5, delay: float = 1.0) -> requests.Response:
    """Handles API request with exponential backoff for rate limiting."""
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
                print(f"Max retries reached. Failing request: {e}")
                raise
            time.sleep(delay * (2 ** i))
    # Should be unreachable
    raise Exception("API request failed unexpectedly.")

# --- LLM COMMAND INTERPRETER (MCP Client Logic) ---

async def interpret_natural_language_command(user_query: str) -> Dict[str, Any]:
    """
    Uses Gemini API to translate natural language into a structured MCP command (Intent Recognition).
    """
    if not API_KEY:
        return {"action": "ERROR", "error": "API Key is missing. Cannot interpret natural language."}
        
    system_prompt = """You are a financial command interpreter. Your role is to translate a user's natural language request into a structured JSON command object for a Model Context Protocol (MCP) server.
    
    Available primary action:
    1. LIST_ACCOUNTS: Lists and filters accounts.

    Available Account Types and their common names:
    - 'Deposit': Checking and Savings accounts.
    - 'Credit Card': Credit card debt/balance accounts.
    - 'Brokerage': Investment accounts (e.g., stocks, 401k, funds).

    Analyze the user's query and provide the corresponding action and parameters in JSON format. Do not include any external commentary or markdown formatting. Only output the JSON object.
    
    Examples:
    - User: "List my accounts" -> {"action": "LIST_ACCOUNTS"}
    - User: "What are my checking and savings accounts?" -> {"action": "LIST_ACCOUNTS", "parameters": {"type": "Deposit"}}
    - User: "Show me my credit card balances" -> {"action": "LIST_ACCOUNTS", "parameters": {"type": "Credit Card"}}
    - User: "What is my investment account balance?" -> {"action": "LIST_ACCOUNTS", "parameters": {"type": "Brokerage"}}
    - User: "Which account has the most money?" -> {"action": "LIST_ACCOUNTS", "parameters": {"sort": "balance_high"}}
    """

    payload = {
        "contents": [{"parts": [{"text": user_query}]}],
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "config": {
            "responseMimeType": "application/json",
            "responseSchema": {
                "type": "OBJECT",
                "properties": {
                    "action": {"type": "STRING", "description": "The primary command action, must be LIST_ACCOUNTS."},
                    "parameters": {
                        "type": "OBJECT",
                        "description": "Optional filters or sort directives.",
                        "properties": {
                            "type": {"type": "STRING", "enum": ["Deposit", "Credit Card", "Brokerage"]},
                            "sort": {"type": "STRING", "enum": ["balance_high", "balance_low", "name"]}
                        }
                    }
                },
                "required": ["action"]
            }
        }
    }

    options = {
        'headers': {'Content-Type': 'application/json'},
        'data': json.dumps(payload)
    }

    try:
        response = exponential_backoff_request(GEMINI_API_URL, options)
        result = response.json()
        
        json_text = result.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text')
        
        if json_text:
            return json.loads(json_text)
        
        error_message = result.get('candidates', [{}])[0].get('finishReason', 'No valid response')
        raise Exception(f"API response failed to generate valid JSON. Reason: {error_message}")
        
    except Exception as e:
        print(f"Error interpreting command via Gemini: {e}")
        return {"action": "ERROR", "error": f"Failed to interpret command: {e}"}

# --- SIMULATED MCP SERVER FUNCTION (Backend Logic) ---

def simulate_mcp_server(structured_command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates the MCP Server that executes the structured command against the database.
    """
    action = structured_command.get("action")
    parameters = structured_command.get("parameters", {})
    
    if action == 'ERROR':
        return {"status": "error", "type": "TEXT", "message": structured_command.get('error', 'Unknown interpretation error.')}

    if action == 'LIST_ACCOUNTS':
        filtered_accounts = MOCK_FINANCIAL_DB["accounts"]
        message = 'Operation successful.'
        type_filter = parameters.get('type')
        sort_key = parameters.get('sort')

        # 1. Filtering
        if type_filter:
            filtered_accounts = [acc for acc in filtered_accounts if acc['type'] == type_filter]
            message = f"Filtered to show {type_filter} accounts."

        # 2. Sorting
        if sort_key:
            if sort_key == 'balance_high':
                filtered_accounts.sort(key=lambda x: x['balance'], reverse=True)
            elif sort_key == 'balance_low':
                filtered_accounts.sort(key=lambda x: x['balance'])
            elif sort_key == 'name':
                filtered_accounts.sort(key=lambda x: x['name'])
            
            message += f" Sorted by {sort_key.replace('_', ' ')}."

        # 3. Final formatting
        account_data = [
            {
                'name': acc['name'],
                'type': acc['type'],
                'id': acc['id'],
                'balance_formatted': format_currency(acc['balance'], acc['currency']),
                'sign': 'Due' if acc['balance'] < 0 else 'Available'
            }
            for acc in filtered_accounts
        ]

        if not account_data:
            return {
                "status": "success",
                "type": "TEXT",
                "message": f"No accounts found matching the filter criteria (Type: {type_filter or 'All'})."
            }

        return {
            "status": "success",
            "type": "FINANCIAL_ACCOUNTS",
            "data": account_data,
            "message": f"Found {len(account_data)} active accounts for {MOCK_FINANCIAL_DB['user_profile']['name']}. {message}".strip()
        }

    return {
        "status": "error",
        "type": "TEXT",
        "message": f"Structured command error. Action '{action}' not recognized by the MCP server."
    }

# --- CONSOLE UI (Simulating Chat) ---

def display_account_list(accounts: List[Dict[str, str]], title: str):
    """Prints the structured financial accounts data to the console."""
    print("\n" + "="*50)
    print(f"MCP RESPONSE: {title}")
    print("="*50)
    
    for acc in accounts:
        status_color = "\033[92m" if acc['sign'] == 'Available' else "\033[91m"
        reset_color = "\033[0m"
        
        print(f"Account: {acc['name']} ({acc['id']})")
        print(f"  Type: {acc['type']}")
        print(f"  Balance: {status_color}{acc['balance_formatted']} ({acc['sign']}){reset_color}")
        print("-" * 50)
    print("\n")


async def main():
    print("Welcome to the Python MCP Simulation Console.")
    print("Type a command starting with '@fintech', or 'quit' to exit.")
    print("Example: @fintech What is my investment account balance?")
    print("="*60)
    
    while True:
        try:
            user_input = input("You: ")
            if user_input.lower() == 'quit':
                break
            
            if user_input.strip().lower().startswith('@fintech'):
                nl_command = user_input.strip()[len('@fintech'):].strip()
                
                print("AI: Translating natural language command...")
                
                # 1. LLM: Translate natural language command to structured JSON
                structured_command = await interpret_natural_language_command(nl_command)
                print(f"DEBUG: LLM translated to: {json.dumps(structured_command)}")

                # 2. MCP Server: Execute the structured command
                mcp_response = simulate_mcp_server(structured_command)

                # 3. Display the result
                if mcp_response['type'] == 'FINANCIAL_ACCOUNTS':
                    display_account_list(mcp_response['data'], mcp_response['message'])
                else:
                    print(f"AI: {mcp_response['message']}\n")
                    
            else:
                print(f"AI: I received your message: \"{user_input}\". Please start with '@fintech' to use the financial tool.\n")
                
        except EOFError:
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            break

if __name__ == "__main__":
    # Running async main loop in a synchronous environment
    import asyncio
    asyncio.run(main())