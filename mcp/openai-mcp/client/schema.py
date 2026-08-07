"""
client/schema.py
=================
Converts MCP tool definitions into the function-calling schema a specific
LLM provider expects. This is the one piece of "translation" a client has
to do that a server never needs to know about.
"""

from mcp.types import Tool as MCPTool


def mcp_tool_to_openai_schema(mcp_tool: MCPTool) -> dict:
    """Reshape an MCP Tool (name, description, JSON-Schema inputSchema)
    into OpenAI's `{"type": "function", "function": {...}}` tool entry.
    """
    return {
        "type": "function",
        "function": {
            "name": mcp_tool.name,
            "description": mcp_tool.description or "",
            "parameters": mcp_tool.inputSchema,
        },
    }
