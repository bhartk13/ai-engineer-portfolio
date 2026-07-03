# SEO & accessibility checklist

## Critical (fix before sharing widely)

- [ ] `<title>` present and descriptive
- [ ] Exactly one primary `<h1>`
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1">`
- [ ] Every `<img>` has meaningful `alt` text (or `alt=""` for decorative)

## SEO (should fix)

- [ ] `<meta name="description">` under ~160 characters
- [ ] `<html lang="en">` (or appropriate language)
- [ ] Descriptive link text (avoid "click here")

## Performance (nice to have)

- [ ] HTML bundle under ~200 KB where possible
- [ ] Minimize inline styles duplication

When issues are found, prefer fixing the source markdown or `_build_html` template via
`code-generator` / writer — then rebuild the site bundle and re-run `check_web_quality`.
