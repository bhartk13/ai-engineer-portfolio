"""
client/config.py
=================
Shared configuration for anything that connects to the notes MCP server:
the terminal client (cli.py) and the web client (web/app.py) both import
from here instead of duplicating these values.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from mcp import StdioServerParameters

load_dotenv()

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = (
    "You are a helpful assistant with access to a notes-taking tool via "
    "MCP. Use the tools when the user asks you to create, list, search, or "
    "delete notes. Otherwise answer normally."
)

# Absolute path to the MCP server script, resolved relative to this file so
# it works regardless of the caller's current working directory.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
SERVER_SCRIPT = PROJECT_ROOT / "server" / "notes_server.py"

# How the client launches the server: as a subprocess, speaking MCP over
# stdio. This is the "connection config" a client needs to reach a server.
SERVER_PARAMS = StdioServerParameters(
    command=sys.executable,
    args=[str(SERVER_SCRIPT)],
)
