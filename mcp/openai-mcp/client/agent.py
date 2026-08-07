"""
client/agent.py
================
The MCP client's core logic, as a reusable class: MCPOpenAIAgent.

WHY A CLIENT?
-------------
The server (server/notes_server.py) only knows how to speak MCP — it has
no idea what an OpenAI model, a prompt, or a chat loop even is. The client
is the piece that:

  1. Talks to an MCP server (list its tools, invoke them with arguments).
  2. Translates the server's tool definitions into the specific
     function-calling schema a given LLM provider expects.
  3. Runs the agent loop: send the conversation + tool schemas to the
     model, and when the model asks to call a tool, forward that call to
     the MCP server, get the result, and feed it back to the model.

This class is deliberately transport/frontend agnostic — both cli.py
(terminal) and web/app.py (FastAPI) construct one MCPOpenAIAgent around the
same MCP ClientSession and just call `run_turn()`. Swap OpenAI for another
provider and only this file's "talk to the LLM" logic changes; the server
and the two frontends wouldn't need to change at all. That reuse is the
whole value proposition of separating server, client, and UI.
"""

import json
from dataclasses import dataclass, field

from mcp import ClientSession
from openai import OpenAI

from .schema import mcp_tool_to_openai_schema


@dataclass
class ToolCallEvent:
    """One MCP tool call made during an agent turn, for display/logging."""

    tool: str
    args: dict
    result: str


class MCPOpenAIAgent:
    """Bridges an OpenAI chat model to tools exposed over an MCP session."""

    def __init__(
        self,
        session: ClientSession,
        openai_client: OpenAI,
        model: str,
        system_prompt: str,
    ):
        self.session = session
        self.openai_client = openai_client
        self.model = model
        self._system_prompt = system_prompt
        self.history: list[dict] = [{"role": "system", "content": system_prompt}]
        self.openai_tools: list[dict] = []

    async def discover_tools(self) -> list:
        """Call MCP's list_tools and cache the OpenAI-schema conversion.

        Returns the raw MCP Tool objects (useful for displaying names/
        descriptions in a UI, independent of the OpenAI-specific shape).
        """
        result = await self.session.list_tools()
        self.openai_tools = [mcp_tool_to_openai_schema(t) for t in result.tools]
        return result.tools

    def reset_history(self) -> None:
        self.history = [{"role": "system", "content": self._system_prompt}]

    async def run_turn(
        self, user_message: str, max_rounds: int = 6
    ) -> tuple[str, list[ToolCallEvent]]:
        """Run one user turn to completion, including any tool-call rounds.

        Returns (final_reply_text, events) where events is the ordered list
        of MCP tool calls the model made along the way.
        """
        self.history.append({"role": "user", "content": user_message})
        events: list[ToolCallEvent] = []

        for _ in range(max_rounds):
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=self.history,
                tools=self.openai_tools,
            )
            choice = response.choices[0]
            self.history.append(choice.message.model_dump(exclude_none=True))

            if choice.finish_reason != "tool_calls":
                return choice.message.content or "", events

            for tool_call in choice.message.tool_calls:
                name = tool_call.function.name
                args = json.loads(tool_call.function.arguments or "{}")

                # --- Forward the call to the MCP server ---
                result = await self.session.call_tool(name, args)
                result_text = "\n".join(
                    block.text for block in result.content if hasattr(block, "text")
                )

                events.append(ToolCallEvent(tool=name, args=args, result=result_text))
                self.history.append(
                    {
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": result_text,
                    }
                )

        return "[stopped after too many tool-call rounds]", events
