# Model Context Protocol (MCP) Chat Simulation

## Overview
This project simulates how an AI client interacts with a secure financial system (the **MCP Server**) using natural language. The goal is to demonstrate how a Large Language Model (LLM) converts a user’s conversational request into a structured backend command.

All interactions run in your terminal, and the LLM call is made to the **Gemini API**.

---

## Prerequisites

- **Python 3.8+**
- **Requests library**
  ```bash
  pip install requests
  ```
- **Gemini API Key**  
  Required for the `interpret_natural_language_command` function.

---

## Setup & Execution

1. Save the script as **mcp_simulation.py**.
2. Insert your Gemini API key:
   ```python
   API_KEY = "YOUR_GEMINI_API_KEY_HERE"
   ```
3. Run in terminal:
   ```bash
   python mcp_simulation.py
   ```

---

## How It Works

This project follows the **Model Context Protocol (MCP)** pattern using three core steps:

### 1. User Input  
You type a natural request starting with `@fintech`, such as:  
`@fintech What is my checking balance?`

### 2. LLM Interpreter  
The function `interpret_natural_language_command` sends your query + system prompt to Gemini, which returns a strict JSON structure such as:

```json
{
  "action": "LIST_ACCOUNTS",
  "parameters": { "type": "Deposit" }
}
```

### 3. MCP Server Simulation  
`simulate_mcp_server` receives the structured command and pulls data from `MOCK_FINANCIAL_DB`.  
The LLM **never directly accesses sensitive data**.

---

## Example Commands

| Natural Language Input | Expected LLM Output |
|------------------------|---------------------|
| `@fintech List all accounts` | `{ "action": "LIST_ACCOUNTS" }` |
| `@fintech What are my investment balances` | `{ "action": "LIST_ACCOUNTS", "parameters": { "type": "Brokerage" }}` |
| `@fintech Show me my checking and savings accounts` | `{ "action": "LIST_ACCOUNTS", "parameters": { "type": "Deposit" }}` |
| `@fintech accounts sorted by balance from highest to lowest` | `{ "action": "LIST_ACCOUNTS", "parameters": { "sort": "balance_high" }}` |
| `@fintech credit card debt` | `{ "action": "LIST_ACCOUNTS", "parameters": { "type": "Credit Card" }}` |

---

## Purpose of This Simulation
- Demonstrates *intent recognition*
- Ensures *secure separation* between LLM and financial data
- Mimics real-world ChatGPT App integrations (e.g., Stripe, Shopify, Tripadvisor)

---