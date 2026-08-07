"""
server/notes_server.py
=======================
A minimal MCP (Model Context Protocol) server.

WHY A SERVER?
-------------
An MCP server is where you expose *capabilities* to an LLM in a standard,
language-agnostic way: tools (functions the model can call), resources
(data the model can read), and prompts (reusable prompt templates).

Without MCP, every app that wants to let an LLM "do something" (query a DB,
hit an API, manage files) has to hand-roll its own function-calling glue for
every model provider it supports. MCP standardizes that boundary: write the
capability once, as a server, and *any* MCP-compatible client (Claude
Desktop, an OpenAI-powered agent, an IDE, etc.) can discover and use it
without custom integration code.

This server implements a tiny in-memory notes app and exposes it as four
tools plus one resource. It knows nothing about OpenAI, Claude, or any
specific LLM — that's the point. It just speaks the MCP protocol over
stdio. See client/ for the code that actually connects a model to this.
"""

from mcp.server.fastmcp import FastMCP

# Create the server. The name shows up when a client introspects the server.
mcp = FastMCP("notes-demo-server")

# In-memory "database". A real server would talk to a file, DB, or API here.
_notes: dict[str, str] = {}
_next_id = 1


@mcp.tool()
def add_note(title: str, content: str) -> str:
    """Create a new note and return its id.

    Args:
        title: Short title for the note.
        content: Body text of the note.
    """
    global _next_id
    note_id = str(_next_id)
    _next_id += 1
    _notes[note_id] = f"{title}\n{content}"
    return f"Created note {note_id}: '{title}'"


@mcp.tool()
def list_notes() -> str:
    """List all notes currently stored, with their ids and titles."""
    if not _notes:
        return "No notes yet."
    lines = []
    for note_id, blob in _notes.items():
        title = blob.split("\n", 1)[0]
        lines.append(f"[{note_id}] {title}")
    return "\n".join(lines)


@mcp.tool()
def search_notes(query: str) -> str:
    """Search notes by a case-insensitive substring match on title or content.

    Args:
        query: Text to search for.
    """
    query_lower = query.lower()
    hits = [
        f"[{note_id}] {blob.splitlines()[0]}"
        for note_id, blob in _notes.items()
        if query_lower in blob.lower()
    ]
    return "\n".join(hits) if hits else f"No notes matched '{query}'."


@mcp.tool()
def delete_note(note_id: str) -> str:
    """Delete a note by id.

    Args:
        note_id: The id returned by add_note / list_notes.
    """
    if note_id in _notes:
        del _notes[note_id]
        return f"Deleted note {note_id}."
    return f"No note with id {note_id}."


@mcp.resource("notes://all")
def all_notes_resource() -> str:
    """Expose all notes as a readable MCP resource (not a tool call).

    Resources are for data the client/model can *read* directly, as opposed
    to tools, which the model actively *invokes* with arguments.
    """
    if not _notes:
        return "No notes stored."
    return "\n\n".join(f"# Note {nid}\n{blob}" for nid, blob in _notes.items())


if __name__ == "__main__":
    # stdio transport: a client spawns this file as a subprocess and talks
    # to it over stdin/stdout using JSON-RPC 2.0 messages. This is the
    # simplest MCP transport and is how Claude Desktop launches local
    # servers. (MCP also supports HTTP/SSE for remote servers.)
    #
    # Note: running `python server/notes_server.py` directly starts the
    # server and blocks waiting for a client to speak MCP on stdin — you
    # won't see interactive output, because this is a protocol endpoint,
    # not a REPL. See README.md for how to run/inspect it standalone.
    mcp.run(transport="stdio")
