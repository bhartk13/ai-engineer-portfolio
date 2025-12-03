Model Context Protocol (MCP) Chat Simulation

This project simulates the core logic of an AI Client interacting with a secure financial system (the "MCP Server") using natural language. It demonstrates how a Large Language Model (LLM) is used to translate a user's conversational request into a structured, executable command (Intent Recognition) before the command is securely processed by the backend.

The entire interaction runs in your terminal, with the LLM call being made to the Gemini API.

Prerequisites

Python: Ensure you have Python 3.8+ installed.

Requests Library: This script requires the requests library for making HTTP calls to the Gemini API.

pip install requests


API Key: A Gemini API key is required for the interpret_natural_language_command function.

Setup and Running

Save the Script: Ensure the code is saved as mcp_simulation.py.

Insert API Key: Open mcp_simulation.py and replace the placeholder value for API_KEY:

API_KEY = "YOUR_GEMINI_API_KEY_HERE"


Execute: Run the script from your terminal:

python mcp_simulation.py


How It Works

This simulation demonstrates the Model Context Protocol (MCP) pattern using three main components:

User Input: You type a command starting with @fintech (e.g., @fintech What is my checking balance?).

LLM Command Interpreter (interpret_natural_language_command): The natural language query is sent to the Gemini model, along with a system prompt defining the available actions (LIST_ACCOUNTS) and parameters (type, sort). The LLM's task is to return a strict JSON object (e.g., {"action": "LIST_ACCOUNTS", "parameters": {"type": "Deposit"}}).

Simulated MCP Server (simulate_mcp_server): This function receives the structured JSON command (not the original text) and executes the instruction against the internal MOCK_FINANCIAL_DB, ensuring that the LLM never directly touches sensitive data.

Example Commands

Try these commands in the running console:

Natural Language Command

Expected LLM Output (Structured Command)

@fintech List all accounts

{"action": "LIST_ACCOUNTS"}

@fintech What are my investment account balances

{"action": "LIST_ACCOUNTS", "parameters": {"type": "Brokerage"}}

@fintech Show me my checking and savings accounts

{"action": "LIST_ACCOUNTS", "parameters": {"type": "Deposit"}}

@fintech accounts sorted by balance from highest to lowest

{"action": "LIST_ACCOUNTS", "parameters": {"sort": "balance_high"}}

@fintech credit card debt

{"action": "LIST_ACCOUNTS", "parameters": {"type": "Credit Card"}}