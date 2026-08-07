"""
mcp_client_openai.py
=====================
A minimal MCP client that bridges an OpenAI model to an MCP server.

WHY A CLIENT?
-------------
The server (mcp_server.py) only knows how to speak MCP — it has no idea
what an OpenAI model, a prompt, or a chat loop even is. The client is the
piece that:

  1. Launches/connects to an MCP server and speaks the MCP protocol to it
     (initialize the session, list its tools/resources).
  2. Translates the server's tool definitions into the *specific* function-
     calling schema a given LLM provider expects (here: OpenAI's `tools`
     format).
  3. Runs the actual agent loop: send the user's message + tool schemas to
     the model, and when the model asks to call a tool, forward that call
     to the MCP server, get the result, and feed it back to the model.

Put differently: MCP standardizes *how tools are described and invoked*.
The client is what connects that standard to a *specific* model's
function-calling API. Swap OpenAI for Claude or another provider and you'd
rewrite this client's "talk to the LLM" logic, but mcp_server.py wouldn't
change at all — that reuse is the whole value proposition of MCP.

Usage:
    export OPENAI_API_KEY=sk-...
    python mcp_client_openai.py
"""

import asyncio
import json
import os
import sys

from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from openai import OpenAI

load_dotenv()

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

SERVER_PARAMS = StdioServerParameters(
    command=sys.executable,          # run with the same python interpreter
    args=["mcp_server.py"],
    env=None,
)

SYSTEM_PROMPT = (
    "You are a helpful assistant with access to a notes-taking tool via "
    "MCP. Use the tools when the user asks you to create, list, search, or "
    "delete notes. Otherwise answer normally."
)


def mcp_tool_to_openai_schema(mcp_tool) -> dict:
    """Convert an MCP Tool definition into an OpenAI `tools` entry.

    MCP tools already carry a JSON Schema for their inputs (`inputSchema`),
    so this is mostly a reshape into the `{"type": "function", ...}`
    envelope OpenAI's Chat Completions API expects.
    """
    return {
        "type": "function",
        "function": {
            "name": mcp_tool.name,
            "description": mcp_tool.description or "",
            "parameters": mcp_tool.inputSchema,
        },
    }


async def run_agent_loop(user_message: str) -> str:
    openai_client = OpenAI()  # reads OPENAI_API_KEY from env

    async with stdio_client(SERVER_PARAMS) as (read, write):
        async with ClientSession(read, write) as session:
            # --- MCP handshake ---
            await session.initialize()

            # --- Discover what the server can do ---
            tools_result = await session.list_tools()
            openai_tools = [mcp_tool_to_openai_schema(t) for t in tools_result.tools]
            print(f"[client] discovered {len(openai_tools)} MCP tools: "
                  f"{[t['function']['name'] for t in openai_tools]}\n")

            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ]

            # --- Agent loop: let the model call tools until it's done ---
            for _ in range(6):  # simple safety cap on tool-call rounds
                response = openai_client.chat.completions.create(
                    model=OPENAI_MODEL,
                    messages=messages,
                    tools=openai_tools,
                )
                choice = response.choices[0]
                messages.append(choice.message.model_dump(exclude_none=True))

                if choice.finish_reason != "tool_calls":
                    return choice.message.content or ""

                for tool_call in choice.message.tool_calls:
                    name = tool_call.function.name
                    args = json.loads(tool_call.function.arguments or "{}")
                    print(f"[client] model requested tool call: {name}({args})")

                    # --- Forward the call to the MCP server ---
                    result = await session.call_tool(name, args)
                    result_text = "\n".join(
                        block.text for block in result.content if hasattr(block, "text")
                    )
                    print(f"[client] MCP server returned: {result_text}\n")

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": result_text,
                        }
                    )

            return "[client] stopped after too many tool-call rounds."


async def main():
    print("MCP + OpenAI demo. Type a message (or 'quit').\n")
    while True:
        user_message = input("You: ").strip()
        if user_message.lower() in {"quit", "exit"}:
            break
        if not user_message:
            continue
        reply = await run_agent_loop(user_message)
        print(f"\nAssistant: {reply}\n")


if __name__ == "__main__":
    asyncio.run(main())
