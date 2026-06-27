"""Build and deploy static sites from workspace markdown — no human-in-the-loop."""

from __future__ import annotations

import io
import json
import os
import re
import time
import zipfile
from datetime import UTC, datetime

import markdown
import requests

from config import WORKSPACE_ROOT

DEFAULT_PLATFORM = os.getenv("DEPLOY_PLATFORM", "netlify").lower()
NETLIFY_TOKEN = os.getenv("NETLIFY_AUTH_TOKEN")
NETLIFY_SITE_ID = os.getenv("NETLIFY_SITE_ID")


def _resolve_markdown_path(markdown_file: str) -> tuple[str, str]:
    path = markdown_file.strip().replace("\\", "/")
    for prefix in ("/workspace/", "./workspace/", "workspace/"):
        if path.startswith(prefix):
            path = path[len(prefix) :]
            break
    if path.startswith("/"):
        path = path.lstrip("/")
    full = os.path.join(WORKSPACE_ROOT, path)
    if not os.path.isfile(full):
        raise FileNotFoundError(f"Markdown file not found: {markdown_file}")
    return full, path


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:48] or "blog-post"


def _build_html(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
  <style>
    body {{ font-family: Georgia, serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; line-height: 1.7; color: #1a1a1a; }}
    h1,h2,h3 {{ font-family: system-ui, sans-serif; }}
    code {{ background: #f4f4f5; padding: 0.1rem 0.35rem; border-radius: 4px; }}
    pre {{ background: #f4f4f5; padding: 1rem; overflow-x: auto; border-radius: 8px; }}
  </style>
</head>
<body>
{body_html}
</body>
</html>"""


def _write_static_bundle(site_slug: str, html: str) -> str:
    site_dir = os.path.join(WORKSPACE_ROOT, "sites", site_slug)
    os.makedirs(site_dir, exist_ok=True)
    index_path = os.path.join(site_dir, "index.html")
    with open(index_path, "w", encoding="utf-8") as handle:
        handle.write(html)
    # Netlify zip deploy can serve index.html as text/plain without explicit headers.
    headers_path = os.path.join(site_dir, "_headers")
    with open(headers_path, "w", encoding="utf-8") as handle:
        handle.write("/*\n  Content-Type: text/html; charset=UTF-8\n")
    return site_dir


def _write_deploy_report(
    site_slug: str,
    platform: str,
    markdown_path: str,
    site_dir: str,
    result: dict,
) -> str:
    report_path = os.path.join(WORKSPACE_ROOT, f"deploy_report_{site_slug}.md")
    lines = [
        f"# Deploy report: {site_slug}",
        "",
    ]
    if result.get("url"):
        lines.extend(
            [
                "## Live URL",
                "",
                f"[{result['url']}]({result['url']})",
                "",
            ]
        )
    lines.extend(
        [
        f"- **Platform (auto-selected):** {platform}",
        f"- **Source:** `{markdown_path}`",
        f"- **Bundle:** `{site_dir}`",
        f"- **Time:** {datetime.now(UTC).isoformat()}",
        "",
        "## Result",
        "",
        "```json",
        json.dumps(result, indent=2),
        "```",
        ]
    )
    with open(report_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines))
    return report_path


def _zip_directory(directory: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for root, _dirs, files in os.walk(directory):
            for name in files:
                full_path = os.path.join(root, name)
                rel_path = os.path.relpath(full_path, directory)
                archive.write(full_path, rel_path)
    return buffer.getvalue()


def _fetch_site_url(site_id: str, headers: dict[str, str]) -> str | None:
    resp = requests.get(
        f"https://api.netlify.com/api/v1/sites/{site_id}",
        headers=headers,
        timeout=30,
    )
    if resp.status_code >= 400:
        return None
    data = resp.json()
    return data.get("ssl_url") or data.get("url")


def _wait_for_deploy(deploy_id: str, headers: dict[str, str], timeout: int = 90) -> dict:
    deadline = time.time() + timeout
    last: dict = {}
    while time.time() < deadline:
        resp = requests.get(
            f"https://api.netlify.com/api/v1/deploys/{deploy_id}",
            headers=headers,
            timeout=30,
        )
        if resp.status_code >= 400:
            break
        last = resp.json()
        state = last.get("state")
        if state in ("ready", "error"):
            return last
        time.sleep(2)
    return last


def _deploy_netlify(site_dir: str, site_slug: str) -> dict:
    if not NETLIFY_TOKEN:
        return {
            "status": "skipped",
            "reason": "Set NETLIFY_AUTH_TOKEN in .env to enable live deployment.",
        }

    headers = {"Authorization": f"Bearer {NETLIFY_TOKEN}"}
    zip_bytes = _zip_directory(site_dir)

    if NETLIFY_SITE_ID:
        site_id = NETLIFY_SITE_ID
    else:
        create_resp = requests.post(
            "https://api.netlify.com/api/v1/sites",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": site_slug, "force_ssl": True},
            timeout=60,
        )
        if create_resp.status_code >= 400:
            return {
                "status": "error",
                "reason": create_resp.text,
            }
        site_id = create_resp.json()["id"]

    deploy_resp = requests.post(
        f"https://api.netlify.com/api/v1/sites/{site_id}/deploys",
        headers={
            **headers,
            "Content-Type": "application/zip",
        },
        data=zip_bytes,
        timeout=120,
    )
    if deploy_resp.status_code >= 400:
        return {"status": "error", "reason": deploy_resp.text}

    payload = deploy_resp.json()
    deploy_id = payload.get("id")
    if deploy_id:
        payload = _wait_for_deploy(deploy_id, headers)

    url = (
        payload.get("ssl_url")
        or payload.get("deploy_ssl_url")
        or payload.get("url")
        or _fetch_site_url(site_id, headers)
    )
    status = "deployed" if payload.get("state") != "error" else "error"
    if status == "error":
        return {
            "status": "error",
            "reason": payload.get("error_message") or "Netlify deploy failed",
            "url": url,
        }

    return {
        "status": status,
        "platform": "netlify",
        "site_id": site_id,
        "url": url,
        "admin_url": payload.get("admin_url"),
        "deploy_state": payload.get("state"),
    }


def deploy_static_site(markdown_file: str, site_slug: str = "blog-post") -> str:
    """Deploy a markdown blog post to free static hosting without asking the user.

    Auto-selects platform (default: Netlify). Builds HTML, saves bundle under
    workspace/sites/, and deploys when NETLIFY_AUTH_TOKEN is configured.

    Args:
        markdown_file: Workspace markdown path (e.g. draft_blog.md).
        site_slug: URL-safe site name for the deployment.
    """
    platform = DEFAULT_PLATFORM if DEFAULT_PLATFORM in {"netlify"} else "netlify"
    site_slug = _slugify(site_slug)

    try:
        full_path, rel_path = _resolve_markdown_path(markdown_file)
    except FileNotFoundError as exc:
        return str(exc)

    with open(full_path, encoding="utf-8") as handle:
        md_content = handle.read()

    title_match = re.search(r"^#\s+(.+)$", md_content, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else "Blog Post"
    body_html = markdown.markdown(md_content, extensions=["extra"])
    html = _build_html(title, body_html)
    site_dir = _write_static_bundle(site_slug, html)

    if platform == "netlify":
        result = _deploy_netlify(site_dir, site_slug)
    else:
        result = {"status": "skipped", "reason": f"Unsupported platform: {platform}"}

    report_path = _write_deploy_report(site_slug, platform, rel_path, site_dir, result)

    if result.get("status") == "deployed":
        return (
            f"Deployed to Netlify (auto-selected platform).\n"
            f"Live URL: {result['url']}\n"
            f"Bundle: {site_dir}\n"
            f"Report: {report_path}"
        )

    return (
        f"Static site built (platform auto-selected: {platform}).\n"
        f"Bundle: {site_dir}\n"
        f"Report: {report_path}\n"
        f"Note: {result.get('reason', 'Configure NETLIFY_AUTH_TOKEN for live deploy.')}"
    )
