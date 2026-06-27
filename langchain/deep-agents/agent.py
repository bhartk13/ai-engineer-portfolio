"""Deep Agent factory: generic orchestrator with dynamic SKILL.md loading."""

from __future__ import annotations

import os
from typing import Literal

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from dotenv import load_dotenv
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from tavily import TavilyClient

load_dotenv()

SKILLS_ROOT = "./skills"
MEMORY_FILES = ["./AGENTS.md"]
WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", "./workspace")
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514"

tavily_api_key = os.getenv("TAVILY_API_KEY")
tavily = TavilyClient(api_key=tavily_api_key) if tavily_api_key else None


def internet_search(
    query: str,
    max_results: int = 5,
    topic: Literal["general", "news", "finance"] = "general",
):
    """Search the web for current information. Use when you need data from the internet."""
    if not tavily:
        return "Tavily API key not found. Set TAVILY_API_KEY in .env for web research."
    return tavily.search(query, max_results=max_results, topic=topic)


ORCHESTRATOR_PROMPT = """You are a generic Deep Agent orchestrator for a multi-agent team.

Your job is to plan, delegate, and coordinate — not to hard-code domain expertise.
Specialized workflows live in SKILL.md files under `skills/`. Load them on demand.

## Workflow

1. **Plan**: For multi-step requests, use `write_todos` to decompose the goal.
2. **Route via skills**: You only see skill names and descriptions initially.
   Before specialized work, use `read_file` to load the matching `skills/<name>/SKILL.md`.
3. **Delegate**: Use the `task` tool with the `general-purpose` subagent for independent
   sub-tasks (research passes, drafting, code review). Subagents share the same skill library.
4. **Collaborate via files**: Pass work between agents through `./workspace/` — researchers
   write notes, writers read them, reviewers comment on artifacts.
5. **Conventions**: Follow `AGENTS.md` for team roles and file naming.

## Constraints

- NEVER write files outside `./workspace/`.
- NEVER use `/tmp/` for persistence.
- Load a skill before executing its workflow.
- Prefer subagents when a sub-task would clutter the main thread.
"""


def _ensure_directories() -> None:
    os.makedirs(WORKSPACE_ROOT, exist_ok=True)
    os.makedirs(SKILLS_ROOT, exist_ok=True)


def _build_model():
    provider = os.getenv("LLM_PROVIDER", "auto").lower()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    def openai_model():
        if not openai_key:
            raise ValueError("OPENAI_API_KEY is not set.")
        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL),
            temperature=0,
            max_retries=int(os.getenv("OPENAI_MAX_RETRIES", "3")),
        )

    def anthropic_model():
        if not anthropic_key:
            raise ValueError("ANTHROPIC_API_KEY is not set.")
        return ChatAnthropic(
            model=os.getenv("ANTHROPIC_MODEL", DEFAULT_ANTHROPIC_MODEL),
            temperature=0,
            max_retries=int(os.getenv("ANTHROPIC_MAX_RETRIES", "3")),
        )

    if provider == "openai":
        return openai_model()
    if provider == "anthropic":
        return anthropic_model()

    # auto: prefer the provider with a configured key
    if anthropic_key and not openai_key:
        return anthropic_model()
    if openai_key and not anthropic_key:
        return openai_model()
    if openai_key:
        # Both keys present — OpenAI is the safer default for local demos
        return openai_model()
    if anthropic_key:
        return anthropic_model()

    raise ValueError(
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env before running the agent."
    )


def get_deep_agent():
    """Create a generic Deep Agent that discovers skills at runtime."""
    _ensure_directories()

    return create_deep_agent(
        model=_build_model(),
        system_prompt=ORCHESTRATOR_PROMPT,
        tools=[internet_search],
        skills=[SKILLS_ROOT],
        memory=MEMORY_FILES,
        backend=FilesystemBackend(root_dir="."),
        name="deep_agent_orchestrator",
    )
