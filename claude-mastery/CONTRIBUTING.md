# Contributing

Thanks for helping keep this course accurate and useful.

## Where content lives

All lessons, quizzes, and exam questions are plain data in `src/data/`:

- `curriculum.js`, `curriculum-2.js`, `curriculum-3.js` — the 12 modules and their checkpoint quizzes
- `exam.js` — the mock-exam question pool

You can fix a fact, add a lesson, or add an exam scenario without touching any React.

## Lesson shape

```js
{
  id: "unique-slug",
  title: "Lesson title",
  body: "Markdown-ish text. **bold**, `code`, - bullets, 1. numbered, \\$ for literal dollar signs.",
  code: "optional code snippet (string)",
  callout: "optional one-line key takeaway",
}
```

## Quiz / exam item shape

```js
{
  q: "The question.",
  options: ["A", "B", "C", "D"],
  answer: 1,            // zero-based index of the correct option
  explain: "Why that answer is right (shown after answering).",
}
```

Exam items additionally carry a `domain` string for the on-screen label.

## Accuracy bar

This is study material people may rely on for certification prep. Please:

- Cite or verify volatile claims (model names, pricing, availability, feature behavior) against
  the official docs at https://docs.claude.com before changing them.
- Prefer durable, conceptual framing over time-sensitive specifics where possible.
- Keep questions unambiguous: exactly one defensibly-best answer, with a real rationale.

## Dev loop

```bash
npm install
npm run dev        # iterate
npm run build      # must pass before you open a PR
```

## Pull requests

Small, focused PRs are easiest to review. Describe what you changed and, for factual edits,
link the source you verified against.
