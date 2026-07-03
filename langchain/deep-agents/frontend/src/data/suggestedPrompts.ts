export type SuggestedPrompt = {
  id: string;
  skill: string;
  label: string;
  prompt: string;
  /** Optional multi-skill pipeline badge */
  pipeline?: boolean;
};

export const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  {
    id: "research",
    skill: "research",
    label: "Web research",
    prompt:
      "Research current trends in MCP and multi-agent protocols. Save cited notes to the workspace (keep under 250 lines).",
  },
  {
    id: "writer",
    skill: "writer",
    label: "Draft from notes",
    prompt:
      "Write a 500-word technical blog post from workspace/research_cambridge_science.md (use the executive summary section). Save as draft_cambridge_science.md.",
  },
  {
    id: "data-analyst",
    skill: "data-analyst",
    label: "CSV analysis",
    prompt:
      "Analyze workspace/sample_sales.csv and produce an executive summary with key revenue and units insights.",
  },
  {
    id: "chart-generator",
    skill: "chart-generator",
    label: "Chart from CSV",
    prompt:
      "Generate a dual-line sales chart from sample_sales.csv — revenue and units by product over time. Save to workspace/charts/.",
  },
  {
    id: "code-generator",
    skill: "code-generator",
    label: "Generate script",
    prompt:
      "Create a Python script in workspace that reads sample_sales.csv and prints total revenue by product.",
  },
  {
    id: "test-runner",
    skill: "test-runner",
    label: "Run tests",
    prompt:
      "Run smoke tests on workspace/check_weather.py and save the test report.",
  },
  {
    id: "code-reviewer",
    skill: "code-reviewer",
    label: "Code review",
    prompt:
      "Review workspace/check_weather.py for bugs, security issues, and duplication. Save findings to the workspace.",
  },
  {
    id: "static-deploy",
    skill: "static-deploy",
    label: "Deploy site",
    prompt:
      "Deploy workspace/draft_multi_agent_orchestration_trends.md to Netlify as a free static page.",
  },
  {
    id: "web-quality",
    skill: "web-quality",
    label: "SEO & a11y audit",
    prompt:
      "Run a web quality audit on the multi-agent-orchestration-trends site bundle and report the score.",
  },
  {
    id: "pipeline",
    skill: "pipeline",
    label: "Full pipeline",
    pipeline: true,
    prompt:
      "Research multi-agent orchestration trends, draft a blog post, deploy to Netlify, and run a web quality audit.",
  },
];

export const SKILL_PROMPT_COLORS: Record<string, string> = {
  research: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  writer: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  "data-analyst": "bg-amber-500/15 text-amber-300 border-amber-500/25",
  "chart-generator": "bg-orange-500/15 text-orange-300 border-orange-500/25",
  "code-generator": "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
  "test-runner": "bg-lime-500/15 text-lime-300 border-lime-500/25",
  "code-reviewer": "bg-rose-500/15 text-rose-300 border-rose-500/25",
  "static-deploy": "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  "web-quality": "bg-teal-500/15 text-teal-300 border-teal-500/25",
  pipeline: "bg-gradient-to-r from-emerald-500/20 to-violet-500/20 text-emerald-200 border-emerald-500/30",
};
