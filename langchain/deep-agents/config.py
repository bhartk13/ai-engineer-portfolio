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
DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514"
