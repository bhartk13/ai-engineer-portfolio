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
from openai import OpenAI

load_dotenv()

OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL")  # e.g. http://localhost:11434/v1 for Ollama


def get_openai_client() -> OpenAI:
    """Build an OpenAI SDK client, optionally pointed at a compatible provider."""
    kwargs: dict = {"api_key": os.environ.get("OPENAI_API_KEY")}
    if OPENAI_BASE_URL:
        kwargs["base_url"] = OPENAI_BASE_URL
    return OpenAI(**kwargs)

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
