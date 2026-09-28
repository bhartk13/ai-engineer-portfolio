# PrepMe

Desktop interview practice. The same `core/` grades answers for a future iOS or Android app.

## Run

```bash
python3 -m http.server 4173
```

Open http://127.0.0.1:4173

On a Mac you can double-click `PrepMe.command`. Leave that window open while you practice.

Voice answers need Chrome or Edge, because that is where speech recognition works. Typing works in every browser. Use Check answer, or press Command-Enter.

## What is shared later

`core/` has no DOM and no network:

- `parseJob.js` reads a job description into a role and skills
- `session.js` picks a drill order and decides when Next unlocks
- `evaluate.js` grades an answer as good, needs improvement, or bad
- `questions.js` is an original drill set

The screen in `app.js` is the desktop client. A later iOS or Android app can import `core/` from a web view (Capacitor) or port the same rules into native screens. Do not rewrite the grader when you change the shell.

```bash
node --test
```
