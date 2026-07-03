"""Shared configuration — import from here to avoid circular imports."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

WORKSPACE_ROOT = os.getenv("WORKSPACE_ROOT", "./workspace")
RUNS_ROOT = os.getenv("RUNS_ROOT", "./runs")
SKILLS_ROOT = "./skills"
MEMORY_FILES = ["./AGENTS.md"]
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"
# Static fallback if model discovery fails — must match ids your Anthropic account exposes.
ANTHROPIC_FAILOVER_MODELS = (
    "claude-haiku-4-5-20251001",
    "claude-sonnet-4-6",
)
DEFAULT_GOOGLE_MODEL = "gemini-2.5-flash-lite"
GOOGLE_FAILOVER_MODELS = (
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
)
