#!/usr/bin/env python3
"""Check a static HTML file for basic SEO and accessibility signals."""

from __future__ import annotations

import argparse
import json
import re
from datetime import UTC, datetime
from html.parser import HTMLParser
from pathlib import Path


class _HtmlAudit(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title = ""
        self.in_title = False
        self.lang: str | None = None
        self.meta: dict[str, str] = {}
        self.h1_count = 0
        self.img_total = 0
        self.img_missing_alt = 0
        self.links_total = 0
        self.links_missing_text = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {k.lower(): (v or "") for k, v in attrs}
        if tag == "html":
            self.lang = attr_map.get("lang") or self.lang
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            name = attr_map.get("name") or attr_map.get("property")
            if name:
                self.meta[name.lower()] = attr_map.get("content", "")
        if tag == "h1":
            self.h1_count += 1
        if tag == "img":
            self.img_total += 1
            alt = attr_map.get("alt", "").strip()
            if not alt:
                self.img_missing_alt += 1
        if tag == "a":
            self.links_total += 1
            text_hint = attr_map.get("aria-label") or attr_map.get("title")
            if not text_hint:
                self.links_missing_text += 1


def _score(audit: _HtmlAudit, html_size: int) -> tuple[int, list[str], list[str]]:
    critical: list[str] = []
    suggestions: list[str] = []
    score = 100

    if not audit.title.strip():
        critical.append("Missing `<title>` element.")
        score -= 20
    if audit.h1_count == 0:
        critical.append("No `<h1>` heading found.")
        score -= 15
    elif audit.h1_count > 1:
        suggestions.append(f"Multiple `<h1>` tags ({audit.h1_count}); prefer one primary heading.")
        score -= 5
    if not audit.lang:
        suggestions.append("Add `lang` attribute on `<html>` for accessibility.")
        score -= 5
    if "viewport" not in audit.meta:
        critical.append("Missing viewport meta tag for mobile layout.")
        score -= 15
    if not audit.meta.get("description"):
        suggestions.append("Add `<meta name=\"description\">` for SEO snippets.")
        score -= 10
    if audit.img_missing_alt:
        critical.append(
            f"{audit.img_missing_alt}/{audit.img_total} images missing `alt` text."
        )
        score -= min(20, audit.img_missing_alt * 5)
    if html_size > 200_000:
        suggestions.append(f"HTML payload is large ({html_size // 1024} KB); consider minification.")
        score -= 5

    score = max(0, min(100, score))
    return score, critical, suggestions


def main() -> int:
    parser = argparse.ArgumentParser(description="Static HTML quality audit")
    parser.add_argument("--html", required=True, help="Absolute path to HTML file")
    parser.add_argument("--report", required=True, help="Absolute path for markdown report")
    parser.add_argument("--site-slug", default="site")
    args = parser.parse_args()

    html_path = Path(args.html)
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    if not html_path.is_file():
        report_path.write_text("# Web Quality Report\n\nHTML file not found.\n")
        print(json.dumps({"status": "error", "report": str(report_path)}))
        return 1

    html = html_path.read_text(encoding="utf-8", errors="replace")
    audit = _HtmlAudit()
    audit.feed(html)
    score, critical, suggestions = _score(audit, len(html.encode("utf-8")))

    lines = [
        "# Web Quality Report",
        "",
        f"_Generated: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}_",
        f"_Site slug: `{args.site_slug}`_",
        f"_File: `{html_path.name}`_",
        "",
        f"## Score: {score}/100",
        "",
    ]
    lines.extend(["## Critical issues", ""] + ([f"- {item}" for item in critical] or ["- None"]))
    lines.extend(["", "## Suggestions", ""] + ([f"- {item}" for item in suggestions] or ["- None"]))
    lines.extend(
        [
            "",
            "## Checks",
            "",
            f"- Title: `{audit.title.strip() or '(missing)'}`",
            f"- `<html lang>`: `{audit.lang or '(missing)'}`",
            f"- Viewport meta: {'yes' if 'viewport' in audit.meta else 'no'}",
            f"- Meta description: {'yes' if audit.meta.get('description') else 'no'}",
            f"- H1 count: {audit.h1_count}",
            f"- Images without alt: {audit.img_missing_alt}/{audit.img_total}",
            "",
        ]
    )
    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"status": "ok", "report": str(report_path), "score": score}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
