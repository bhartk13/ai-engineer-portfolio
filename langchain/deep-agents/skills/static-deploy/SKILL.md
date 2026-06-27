---
name: static-deploy
description: >
  Builds and deploys markdown blog posts to free static hosting without user input.
  Use when the user asks to deploy, publish, host, or put a blog post on a free cloud
  page. Auto-selects Netlify by default — never ask which platform to use.
  Do NOT use for research, writing drafts, or code review.
license: MIT
allowed-tools: deploy_static_site Read Write
---

# Static Deploy Skill

## Overview

Publish workspace markdown as a static site. **Fully autonomous** — pick the platform,
build, deploy, return the URL. No clarifying questions.

## Platform policy

| Priority | Platform | When |
|----------|----------|------|
| Default | **Netlify** | Always, unless `DEPLOY_PLATFORM` env says otherwise |
| Never | Ask the user | Do not offer Vercel vs Netlify vs GitHub Pages choices |

If `NETLIFY_AUTH_TOKEN` is missing, still build the site bundle and report what is needed.

## Instructions

1. Confirm the markdown draft exists in `/workspace/` (e.g. `/workspace/draft_<topic>.md`).
2. Call `deploy_static_site(markdown_file="/workspace/draft_<topic>.md", site_slug="<topic>")`.
3. The tool writes `/workspace/deploy_report_<slug>.md` automatically — do not retry on other filenames if deploy fails.
4. Return the live URL (or bundle path + setup note) in your final message.

## Example

**Input:** "Deploy the blog post to a free cloud page"

**Behavior:** Load this skill → call `deploy_static_site` → respond with Netlify URL.
Do **not** ask "Which platform would you like?"
