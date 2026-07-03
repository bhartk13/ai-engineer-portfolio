---
name: web-quality
description: >
  Audits static HTML in the workspace for SEO, accessibility, and mobile basics.
  Use after static-deploy or when the user asks for accessibility, SEO, quality,
  or page review of a deployed site bundle. Do NOT use for writing new content.
license: MIT
allowed-tools: check_web_quality Read Write
---

# Web Quality Skill

## Overview

Score a built static site (`/workspace/sites/<slug>/index.html`) and save a report.

## Instructions

1. Confirm the site bundle exists (usually after `static-deploy`).
2. Load `skills/web-quality/references/seo-a11y-checklist.md` for remediation guidance.
3. Call `check_web_quality(site_slug="<slug>")` **or**
   `check_web_quality(html_file="/workspace/sites/<slug>/index.html")`.
4. Summarize score (/100), critical issues, and quick fixes for the user.

## Outputs

| Artifact | Path |
|----------|------|
| Quality report | `/workspace/quality_report_<slug>.md` |

## Example pipeline

Research → writer → static-deploy → **web-quality** → return live URL + quality score.
