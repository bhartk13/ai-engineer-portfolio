# LLM Agent with Tool Calling (PoC)

## Overview
This project demonstrates a simple AI agent that uses an LLM to:
- Understand user intent
- Decide when to call tools (functions)
- Orchestrate API/database calls
- Produce grounded responses

## Key Concepts Demonstrated
- Prompt engineering
- LLM tool/function calling
- Reasoning → action → observation loop
- Separation of reasoning (LLM) and execution (code)

## Example Query
"Show my last 3 orders and their delivery status"

## Architecture
User → LLM → Tool Execution → LLM → Final Response

## How to Run
```bash
pip install -r requirements.txt
export OPENAI_API_KEY=your_key_here
python agent.py
