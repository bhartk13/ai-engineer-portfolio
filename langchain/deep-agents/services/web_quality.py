"""Audit deployed static HTML for SEO and accessibility basics."""

from __future__ import annotations

import json
import os
import re

from config import SKILLS_ROOT, WORKSPACE_ROOT
from services.sandbox_runner import PROJECT_ROOT, PYTHON, resolve_workspace_path, run_in_workspace

CHECK_SCRIPT = os.path.join(PROJECT_ROOT, SKILLS_ROOT, "web-quality", "scripts", "check_html.py")


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "site"


def check_web_quality(html_file: str = "", site_slug: str = "") -> str:
    """Audit a static HTML file for SEO, accessibility, and mobile basics.

    Provide either `html_file` (e.g. /workspace/sites/my-slug/index.html) or
    `site_slug` (looks up /workspace/sites/<slug>/index.html).

    Writes /workspace/quality_report_<slug>.md.
    """
    if site_slug and not html_file:
        slug = _slugify(site_slug)
        html_file = f"/workspace/sites/{slug}/index.html"
    elif html_file:
        slug = _slugify(site_slug or os.path.basename(os.path.dirname(html_file)))
    else:
        return "Provide html_file or site_slug."

    try:
        html_full, _ = resolve_workspace_path(html_file)
    except ValueError as exc:
        return str(exc)

    if not os.path.isfile(html_full):
        return f"HTML file not found: {html_file}"

    if not os.path.isfile(CHECK_SCRIPT):
        return f"Quality check script missing: {CHECK_SCRIPT}"

    report_full = os.path.join(WORKSPACE_ROOT, f"quality_report_{slug}.md")
    result = run_in_workspace(
        [
            PYTHON,
            CHECK_SCRIPT,
            "--html",
            html_full,
            "--report",
            report_full,
            "--site-slug",
            slug,
        ]
    )

    rel_report = os.path.relpath(report_full, WORKSPACE_ROOT)

    if not result.ok:
        return (
            f"Quality check failed.\n"
            f"Report: /workspace/{rel_report}\n"
            f"stderr:\n{result.stderr}"
        )

    try:
        payload = json.loads(result.stdout.strip().splitlines()[-1])
        score = payload.get("score", "?")
    except (json.JSONDecodeError, IndexError):
        score = "?"

    return (
        f"Web quality audit complete.\n"
        f"Score: {score}/100\n"
        f"Report: /workspace/{rel_report}\n"
        f"HTML: {html_file}"
    )
