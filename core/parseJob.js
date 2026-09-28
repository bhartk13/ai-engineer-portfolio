export const ROLE_LABELS = {
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  data: "Data",
  pm: "Product",
  platform: "Platform",
  swe: "Software engineering",
  ai: "Agentic AI",
};

const SKILLS = [
  { id: "javascript", label: "JavaScript", re: /\b(javascript|typescript|ecmascript)\b/i },
  { id: "react", label: "React", re: /\breact(\s*native)?\b/i },
  { id: "node", label: "Node", re: /\bnode\.?js\b/i },
  { id: "python", label: "Python", re: /\bpython\b/i },
  { id: "java", label: "Java", re: /\bjava\b/i },
  { id: "kotlin", label: "Kotlin", re: /\bkotlin\b/i },
  { id: "swift", label: "Swift", re: /\bswift(ui)?\b/i },
  { id: "android", label: "Android", re: /\bandroid\b/i },
  { id: "mobile", label: "Mobile", re: /\b(mobile|ios|android|swift|kotlin|react native)\b/i },
  { id: "sql", label: "SQL", re: /\b(sql|postgres|postgresql|mysql|database)\b/i },
  { id: "api", label: "APIs", re: /\b(apis?|rest|graphql|grpc)\b/i },
  { id: "system-design", label: "System design", re: /\b(system design|distributed|scalability|microservices?)\b/i },
  { id: "aws", label: "Cloud", re: /\b(aws|gcp|azure|cloud)\b/i },
  { id: "kubernetes", label: "Kubernetes", re: /\b(kubernetes|k8s|docker)\b/i },
  { id: "testing", label: "Testing", re: /\b(tests?|testing|qa|jest|pytest|playwright)\b/i },
  { id: "ml", label: "Machine learning", re: /\b(machine learning|\bml\b|models?|llm|training data)\b/i },
  { id: "agentic", label: "Agentic AI", re: /\b(agentic(?:\s+ai)?|ai agents?|ai engineer|llms?|large language models?|tool calling|function calling|retrieval augmented|rag|generative ai|openai|langchain|langgraph)\b|\bai\b/i },
  { id: "data", label: "Data", re: /\b(analytics|data warehouse|etl|dbt|spark|experiment)\b/i },
  { id: "product", label: "Product", re: /\b(product manager|product owner|roadmap|user research)\b/i },
  { id: "leadership", label: "Leadership", re: /\b(mentor|mentoring|staff|principal|managing|people management)\b/i },
  { id: "a11y", label: "Accessibility", re: /\b(accessibility|a11y|wcag|screen readers?)\b/i },
  { id: "security", label: "Security", re: /\b(security|oauth|authn|authz|authentication)\b/i },
];

export function parseJob(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  const skills = SKILLS.filter((skill) => skill.re.test(text)).map((skill) => ({
    id: skill.id,
    label: skill.label,
  }));
  const skillIds = skills.map((skill) => skill.id);
  const seniority = inferSeniority(text);
  const role = inferRole(text, skillIds);
  const title = inferTitle(text);

  return {
    text,
    title,
    role,
    roleLabel: ROLE_LABELS[role] || ROLE_LABELS.swe,
    seniority,
    skills,
    skillIds,
  };
}

function inferSeniority(text) {
  if (/\b(staff|principal|director|head of)\b/i.test(text)) return "senior";
  if (/\b(senior|sr\.?|lead)\b/i.test(text)) return "senior";
  if (/\b(junior|jr\.?|intern|new grad|entry[- ]level)\b/i.test(text)) return "junior";
  return "mid";
}

function inferRole(text, skillIds) {
  if (/\b(product manager|product owner)\b/i.test(text)) return "pm";
  if (/\b(agentic(?:\s+ai)?|ai engineer|llm engineer|ml engineer|machine learning engineer)\b/i.test(text)) {
    return "ai";
  }
  if (
    skillIds.includes("mobile") ||
    /\b(ios engineer|android engineer|mobile engineer)\b/i.test(text)
  ) {
    return "mobile";
  }
  if (/\b(data scientist|data analyst|data engineer|analytics engineer)\b/i.test(text)) return "data";
  if (/\b(sre|devops|platform engineer)\b/i.test(text) || (skillIds.includes("kubernetes") && /\bplatform\b/i.test(text))) {
    return "platform";
  }
  if (skillIds.includes("react") || /\b(frontend|front-end|ui engineer)\b/i.test(text)) return "frontend";
  if (
    skillIds.includes("python") ||
    skillIds.includes("java") ||
    skillIds.includes("node") ||
    skillIds.includes("api")
  ) {
    return "backend";
  }
  return "swe";
}

function inferTitle(text) {
  const first = text
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && line.length < 80);
  if (!first) return "this role";
  if (/[.!?]$/.test(first) || first.split(/\s+/).length > 12) return "this role";
  return first.replace(/^#+\s*/, "");
}
