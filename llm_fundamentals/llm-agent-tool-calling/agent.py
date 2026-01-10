from openai import OpenAI
from config import OPENAI_API_KEY, MODEL_NAME
from tools import get_recent_orders, get_delivery_status
import json

client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT_TEMPLATE = """
You are an AI agent.
The authenticated user_id is {user_id}.
You may call tools to retrieve data.
Use tools only when necessary.
Return a final, user-friendly response.
"""

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_recent_orders",
            "description": "Get last 3 orders for a user",
            "parameters": {
                "type": "object",
                "properties": {
                    "user_id": {"type": "string"}
                },
                "required": ["user_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_delivery_status",
            "description": "Get delivery status of an order",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {"type": "string"}
                },
                "required": ["order_id"]
            }
        }
    }
]


def run_agent(user_id: str, user_query: str):
    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(user_id=user_id)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_query}
    ]

    # First LLM call (reasoning + tool selection)
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto"
    )

    assistant_message = response.choices[0].message
    tool_calls = assistant_message.tool_calls

    # If no tools are required, return directly
    if not tool_calls:
        return assistant_message.content

    # ✅ REQUIRED: append assistant message that contains tool_calls
    messages.append({
        "role": "assistant",
        "content": assistant_message.content,
        "tool_calls": tool_calls
    })

    # Execute tools
    for call in tool_calls:
        tool_name = call.function.name
        args = json.loads(call.function.arguments)

        if tool_name == "get_recent_orders":
            result = get_recent_orders(**args)
        elif tool_name == "get_delivery_status":
            result = get_delivery_status(**args)
        else:
            result = {}

        messages.append({
            "role": "tool",
            "tool_call_id": call.id,
            "name": tool_name,
            "content": json.dumps(result)
        })

    # Final LLM call (response synthesis)
    final_response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=messages
    )

    return final_response.choices[0].message.content


if __name__ == "__main__":
    user_id = "USER_001"
    query = "Show my last 3 orders and their delivery status"
    print(run_agent(user_id, query))
