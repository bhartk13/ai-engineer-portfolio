"""
cli.py
======
Terminal entrypoint for the OpenAI + MCP demo.

This file has no business logic of its own — it opens an MCP session
against server/notes_server.py, hands it to a client.agent.MCPOpenAIAgent,
and loops on stdin/stdout. All the actual client behavior (tool discovery,
schema translation, the agent loop) lives in client/agent.py so it can be
shared with web/app.py.

Usage:
    export OPENAI_API_KEY=sk-...
    python cli.py
"""

import asyncio

from mcp import ClientSession
from mcp.client.stdio import stdio_client
from client.agent import MCPOpenAIAgent
from client.config import OPENAI_MODEL, SERVER_PARAMS, SYSTEM_PROMPT, get_openai_client


async def main():
    openai_client = get_openai_client()

    async with stdio_client(SERVER_PARAMS) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()

            agent = MCPOpenAIAgent(session, openai_client, OPENAI_MODEL, SYSTEM_PROMPT)
            tools = await agent.discover_tools()
            print(f"[client] discovered {len(tools)} MCP tools: "
                  f"{[t.name for t in tools]}\n")

            print("MCP + OpenAI demo. Type a message (or 'quit').\n")
            while True:
                user_message = input("You: ").strip()
                if user_message.lower() in {"quit", "exit"}:
                    break
                if not user_message:
                    continue

                reply, events = await agent.run_turn(user_message)
                for ev in events:
                    print(f"[client] tool call: {ev.tool}({ev.args}) -> {ev.result}")
                print(f"\nAssistant: {reply}\n")


if __name__ == "__main__":
    asyncio.run(main())
