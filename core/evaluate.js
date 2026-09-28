const MIN_WORDS = 32;

export function wordCount(text) {
  return (String(text || "").trim().match(/\b[\w’']+\b/g) || []).length;
}

export function evaluateAnswer(question, transcript) {
  const text = String(transcript || "").replace(/\s+/g, " ").trim();
  const words = wordCount(text);
  const hits = question.signals.map((signal) => ({
    id: signal.id,
    label: signal.label,
    hit: signal.pattern.test(text),
  }));
  const hitCount = hits.filter((item) => item.hit).length;
  const needed = Math.ceil(question.signals.length * 0.75);
  const voiceOk = question.track !== "behavioral" || hasFirstPerson(text);
  const coveragePass = hitCount >= needed;
  const lengthPass = words >= MIN_WORDS;

  let verdict = "bad";
  if (coveragePass && lengthPass && voiceOk) verdict = "good";
  else if (hitCount >= Math.max(1, needed - 1) || (hitCount >= 1 && words >= 20)) verdict = "needs-improvement";

  const notes = [];
  if (verdict === "good") {
    notes.push("Good. This answer covers the ideas that matter.");
  } else if (verdict === "needs-improvement") {
    notes.push("Needs improvement. The bones are there. Close the gaps and try again.");
  } else {
    notes.push("Bad. This does not answer the question yet. Use the cheat sheet and tell a specific story.");
  }

  if (!lengthPass) {
    notes.push(`Give it more substance. This is ${words} words; a passing answer needs at least ${MIN_WORDS}.`);
  }
  if (question.track === "behavioral" && !hasFirstPerson(text)) {
    notes.push("Say what you did. Use I, not only we.");
  }
  for (const item of hits) {
    if (!item.hit) notes.push(`Missing: ${item.label}.`);
  }
  if (question.wantsMetric && verdict !== "bad" && !hasMetric(text)) {
    notes.push("A real number would make this stronger. It is not required to pass.");
  }

  return {
    verdict,
    hitCount,
    needed,
    wordCount: words,
    hits,
    notes,
  };
}

function hasFirstPerson(text) {
  return /\b(i|i'm|i've|i’ve|i'd|i’d|my)\b/i.test(text);
}

function hasMetric(text) {
  return (
    /\d/.test(text) ||
    /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundred|thousand|percent|half)\b/i.test(text)
  );
}
