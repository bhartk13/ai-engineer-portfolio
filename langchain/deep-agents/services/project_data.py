"""Shared helpers for skills, workspace, and AGENTS.md."""

from __future__ import annotations

import os

from agent import WORKSPACE_ROOT

SKILLS_DIR = "./skills"
AGENTS_MD_PATH = "./AGENTS.md"


def parse_skill_frontmatter(skill_path: str) -> dict[str, str] | None:
    skill_md = os.path.join(skill_path, "SKILL.md")
    if not os.path.exists(skill_md):
        return None

    with open(skill_md, encoding="utf-8") as handle:
        content = handle.read()

    if not content.startswith("---"):
        return None

    parts = content.split("---", 2)
    if len(parts) < 3:
        return None

    info: dict[str, str] = {}
    for line in parts[1].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            info[key.strip()] = value.strip().strip('"').strip("'")
    info["folder"] = os.path.basename(skill_path)
    return info


def list_skills() -> list[dict[str, str]]:
    skills: list[dict[str, str]] = []
    if not os.path.isdir(SKILLS_DIR):
        return skills

    for entry in sorted(os.listdir(SKILLS_DIR)):
        skill_path = os.path.join(SKILLS_DIR, entry)
        if not os.path.isdir(skill_path):
            continue
        info = parse_skill_frontmatter(skill_path)
        if info:
            skills.append(info)
    return skills


def list_workspace_files() -> list[str]:
    files: list[str] = []
    if not os.path.isdir(WORKSPACE_ROOT):
        return files

    for root, _dirs, filenames in os.walk(WORKSPACE_ROOT):
        for filename in filenames:
            if filename == ".gitkeep":
                continue
            rel_path = os.path.relpath(os.path.join(root, filename), WORKSPACE_ROOT)
            files.append(rel_path)
    return sorted(files)


def read_workspace_file(rel_path: str) -> str:
    file_path = os.path.join(WORKSPACE_ROOT, rel_path)
    if not os.path.isfile(file_path):
        raise FileNotFoundError(rel_path)
    with open(file_path, encoding="utf-8") as handle:
        return handle.read()


def clear_workspace() -> int:
    removed = 0
    for rel_path in list_workspace_files():
        os.remove(os.path.join(WORKSPACE_ROOT, rel_path))
        removed += 1
    return removed


def read_agents_md() -> str:
    if not os.path.exists(AGENTS_MD_PATH):
        return ""
    with open(AGENTS_MD_PATH, encoding="utf-8") as handle:
        return handle.read()
