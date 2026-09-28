import assert from "node:assert/strict";
import test from "node:test";
import { evaluateAnswer, wordCount } from "./evaluate.js";
import { parseJob } from "./parseJob.js";
import { QUESTIONS } from "./questions.js";
import { SAMPLE_JD } from "./sampleJob.js";
import { buildSession, canAdvance } from "./session.js";

const disagree = QUESTIONS.find((question) => question.id === "disagree");
const idempotent = QUESTIONS.find((question) => question.id === "idempotent-api");

const STRONG_DISAGREE = `
During a checkout rewrite I had pushback from another engineer.
They were worried a new token design would log people out.
I wrote a migration plan with a week of dual reads and paired on the rollout.
We shipped it with sessions intact and no spike in login failures.
`.trim();

test("a paraphrased disagreement passes without the word disagreed", () => {
  assert.equal(/\bdisagreed\b/i.test(STRONG_DISAGREE), false);
  const result = evaluateAnswer(disagree, STRONG_DISAGREE);
  assert.equal(result.verdict, "good");
  assert.ok(result.hitCount >= result.needed);
});

test("a slogan with no story is bad", () => {
  const result = evaluateAnswer(disagree, "I always communicate and try to be a team player.");
  assert.equal(result.verdict, "bad");
});

test("a short partial answer needs improvement and cannot advance", () => {
  const result = evaluateAnswer(
    disagree,
    "I had pushback from a teammate. They were worried about risk. I wrote a note.",
  );
  assert.equal(result.verdict, "needs-improvement");
  assert.equal(canAdvance(result.verdict, false), false);
  assert.equal(canAdvance("good", false), true);
  assert.equal(canAdvance("bad", true), true);
});

test("idempotent retry answer passes on the ideas, not a single keyword", () => {
  const answer = `
    The client sends an Idempotency-Key and reuses that same key on every retry.
    The server stores the key with the saved response in a unique row before it captures payment.
    If the key already exists I return the original response and do not charge again.
    If the body differs I return a conflict instead of a second success.
  `;
  const result = evaluateAnswer(idempotent, answer);
  assert.equal(result.verdict, "good");
  assert.ok(wordCount(answer) >= 32);
});

test("a frontend job description selects frontend drills and skips offline sync", () => {
  const profile = parseJob(SAMPLE_JD);
  assert.equal(profile.role, "frontend");
  assert.equal(profile.seniority, "senior");
  assert.ok(profile.skillIds.includes("react"));
  assert.ok(profile.skillIds.includes("javascript"));
  assert.ok(profile.skillIds.includes("a11y"));
  assert.equal(profile.skillIds.includes("java"), false);

  const session = buildSession(profile);
  const ids = session.map((question) => question.id);
  assert.ok(ids.includes("react-state"));
  assert.ok(ids.includes("a11y-review"));
  assert.equal(ids.includes("offline-sync"), false);
  assert.ok(ids.length >= 6);
  assert.equal(session[0].track, "behavioral");
});

test("every cheat-sheet sketch is itself a passing answer", () => {
  for (const question of QUESTIONS) {
    const result = evaluateAnswer(question, question.cheat.sketch);
    const missing = result.hits.filter((item) => !item.hit).map((item) => item.id);
    assert.equal(
      result.verdict,
      "good",
      `${question.id} was ${result.verdict} (${result.hitCount}/${result.needed}, ${result.wordCount} words, missing ${missing.join(", ")})`,
    );
  }
});

test("javascript in a description does not count as java", () => {
  const profile = parseJob("Backend engineer. Java, PostgreSQL, and REST APIs.");
  assert.equal(profile.role, "backend");
  assert.ok(profile.skillIds.includes("java"));
  assert.equal(profile.skillIds.includes("javascript"), false);
});

test("an agentic AI title opens on agentic drills", () => {
  const profile = parseJob("agentic ai engineer");
  assert.equal(profile.role, "ai");
  assert.equal(profile.roleLabel, "Agentic AI");
  assert.ok(profile.skillIds.includes("agentic"));

  const ids = buildSession(profile).map((question) => question.id);
  assert.equal(ids[0], "agent-vs-workflow");
  assert.ok(ids.includes("tool-grounding"));
  assert.ok(ids.includes("agent-eval"));
  assert.ok(ids.includes("human-approval"));
  assert.ok(ids.includes("agent-cost"));
  assert.equal(ids.includes("react-state"), false);
  assert.equal(ids.includes("offline-sync"), false);
});
