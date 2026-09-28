import { QUESTIONS } from "./questions.js";

export function scoreQuestion(question, profile) {
  let score = 0;
  for (const skill of question.skills) {
    if (profile.skillIds.includes(skill)) score += 3;
  }
  if (question.roles.includes(profile.role)) score += 2;
  if (question.roles.includes("general")) score += 1;
  if (question.seniority.includes(profile.seniority)) score += 1;
  return score;
}

export function buildSession(profile) {
  const ranked = QUESTIONS.map((question) => ({
    question,
    score: scoreQuestion(question, profile),
  })).sort((a, b) => b.score - a.score || a.question.weight - b.question.weight);

  const behavioral = ranked.filter((item) => item.question.track === "behavioral").slice(0, 3);
  const technical = ranked.filter((item) => item.question.track === "technical" && item.score > 0);
  const roleFit = ranked.filter((item) => {
    if (item.question.track !== "technical") return false;
    if (technical.some((picked) => picked.question.id === item.question.id)) return false;
    return item.question.roles.includes(profile.role);
  });

  const tech = [...technical, ...roleFit].slice(0, 5);
  const ordered = [];
  if (profile.role === "ai" && tech.length) {
    for (const item of tech) ordered.push(item.question);
    for (const item of behavioral) ordered.push(item.question);
    return ordered;
  }
  if (behavioral[0]) ordered.push(behavioral[0].question);
  for (const item of tech) ordered.push(item.question);
  for (const item of behavioral.slice(1)) ordered.push(item.question);
  return ordered;
}

export function canAdvance(verdict, alreadyPassed) {
  return Boolean(alreadyPassed) || verdict === "good";
}
