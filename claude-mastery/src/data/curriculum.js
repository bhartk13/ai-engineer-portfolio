// curriculum.js
// The complete Claude Certified Architect learning curriculum.
// Each module: { id, title, eyebrow, summary, est, lessons[], quiz[] }
// Each lesson: { id, title, body (markdown-ish), code? , callout? }
// Each quiz item: { q, options[], answer (index), explain }
//
// Content reflects the Claude product ecosystem as of June 2026.
// Verify volatile facts (pricing, model strings) against docs.claude.com.

export const META = {
  title: "Claude Mastery",
  subtitle: "From fundamentals to architect-level fluency",
  updated: "June 2026",
  examName: "Claude Certified Architect",
};

export const MODULES = [
  // ───────────────────────────────────────────────────────── 01
  {
    id: "foundations",
    title: "Foundations & the Claude ecosystem",
    eyebrow: "Orientation",
    est: "45 min",
    summary:
      "What Claude is, how Anthropic builds and aligns it, and the shape of the product surface you'll be architecting on top of.",
    lessons: [
      {
        id: "what-is-claude",
        title: "What Claude actually is",
        body: `Claude is a family of large language models built by Anthropic, an AI safety company founded in 2021. A large language model predicts text, but the useful framing for an architect is different: Claude is a *general reasoning engine you call as a service*. You send it context and instructions; it returns text, structured data, tool calls, or actions.

The thing to internalize early is that Claude is not a database and not a deterministic function. The same prompt can yield different outputs. Your job as an architect is to build systems that are reliable *around* a probabilistic core — through prompting, retrieval, tool design, validation, and evaluation.

Three distinct products expose Claude, and confusing them is the most common beginner mistake:

- **Claude.ai** — the consumer chat app (web, desktop, mobile). Home of Projects, Artifacts, and connectors.
- **Claude Developer Platform (the API)** — programmatic access for building your own applications. Billed per token.
- **Claude Code** — an agentic coding tool that runs in your terminal, IDE, or app and edits real codebases.

A subscription to Claude.ai does *not* grant API access, and vice versa. They bill separately.`,
        callout:
          "Architect mindset: treat Claude as a probabilistic service and engineer reliability around it — never assume deterministic output.",
      },
      {
        id: "constitutional-ai",
        title: "Constitutional AI & alignment",
        body: `Anthropic trains Claude with a method called **Constitutional AI (CAI)**. Instead of relying solely on humans to label good vs. bad outputs, the model is given a written "constitution" — a set of principles — and learns to critique and revise its own responses against those principles. This produces helpful, harmless, honest behavior with far less human labeling.

Why an architect cares: Claude's alignment shapes how it behaves at the edges. It is comparatively more likely to refuse genuinely harmful requests and to flag uncertainty. When you design a product, you are designing *with* a model that has values baked in. You cannot prompt those away, and you shouldn't try — instead design flows that don't fight them.

The constitution has grown from ~2,700 words in 2023 to roughly 23,000 words by 2026, with detailed explanations of intended behavior and rationale. The lineage traces to Anthropic's 2022 paper, "Constitutional AI: Harmlessness from AI Feedback."`,
        callout:
          "You can shape Claude's behavior with prompts, but you build on top of its trained values — not against them.",
      },
      {
        id: "tokens-context",
        title: "Tokens, context windows & the cost model",
        body: `Claude reads and writes **tokens**, not words. A token is a chunk of text — roughly 3–4 characters of English, so ~750 words ≈ 1,000 tokens. Everything is priced and limited in tokens.

The **context window** is the maximum number of tokens Claude can consider at once (input + output). Current Claude models offer up to a 1-million-token context window (with some tiers at 200K). A 1M window is enormous — hundreds of pages — but it is not free: you pay for every input token on every call, and very long contexts can dilute attention. "Just stuff everything in the context" is a real strategy *and* a real way to burn money and degrade quality.

Pricing is quoted per million tokens (MTok), split into input and output rates, with output always more expensive. As of June 2026 the public lineup runs roughly: Haiku 4.5 at \\$1/\\$5, Sonnet 4.6 at \\$3/\\$15, Opus 4.8 at \\$5/\\$25, and Fable 5 at \\$10/\\$50. Prompt caching and batch processing can cut these dramatically — covered later.`,
        code: `// Rough token math for budgeting
const WORDS = 5000;                 // a long document
const tokensIn  = Math.ceil(WORDS / 0.75);   // ≈ 6,667 input tokens
const tokensOut = 800;              // expected answer length

// Sonnet 4.6 example rates ($ per million tokens)
const IN_RATE = 3, OUT_RATE = 15;
const cost = (tokensIn/1e6)*IN_RATE + (tokensOut/1e6)*OUT_RATE;
console.log(\`~$\${cost.toFixed(4)} per call\`); // ~ $0.032`,
        callout:
          "Every architecture decision has a token cost. Estimate tokens early — it drives model choice, caching, and retrieval design.",
      },
      {
        id: "surface-map",
        title: "Mapping the product surface",
        body: `Before going deep, hold the whole map in your head. You will architect across these layers:

- **Models** — Haiku / Sonnet / Opus tiers, plus the Mythos-class frontier (Fable). Pick per task by cost, latency, and capability.
- **Prompting** — system prompts, few-shot examples, structured output, extended thinking.
- **Claude.ai features** — Projects (persistent knowledge + instructions), Artifacts (generated apps/docs in a side panel), connectors.
- **API capabilities** — Messages API, streaming, tool use, batch, prompt caching, the Files API, vision.
- **Tool use & MCP** — letting Claude call your functions, and the Model Context Protocol standard for connecting tools/data.
- **Agents** — multi-step, self-directed workflows; subagents; verification loops.
- **RAG** — retrieval-augmented generation for grounding answers in your data.
- **Coding workflows** — Claude Code, agentic editing, parallel subagents.
- **Cross-cutting** — security, evaluation, cost/latency optimization, enterprise governance.

Every later module is one of these boxes opened up.`,
      },
    ],
    quiz: [
      {
        q: "A user has a Claude.ai Pro subscription and asks why their API calls are being billed separately. What's the correct explanation?",
        options: [
          "It's a billing bug; Pro should cover API usage.",
          "Claude.ai subscriptions and the Developer Platform (API) are separate products billed independently.",
          "API access requires an Enterprise plan only.",
          "They must be using the wrong model string.",
        ],
        answer: 1,
        explain:
          "Claude.ai (consumer) and the API (developer) are distinct products with separate billing. A Pro/Max/Team/Enterprise subscription does not include API token usage.",
      },
      {
        q: "Why is 'just put everything in the 1M-token context window' often a poor architecture?",
        options: [
          "The context window can't actually hold that much.",
          "You pay for every input token per call, and very long contexts can dilute the model's attention.",
          "Claude refuses long inputs for safety reasons.",
          "Long contexts disable tool use.",
        ],
        answer: 1,
        explain:
          "Large contexts are billed per token on every call and can reduce answer quality by diluting attention. Retrieval and caching usually beat brute-force stuffing.",
      },
      {
        q: "What does Constitutional AI primarily change about how Claude is trained?",
        options: [
          "It removes the need for any training data.",
          "It lets the model critique and revise its own outputs against written principles, reducing reliance on human labels.",
          "It hard-codes refusals into a lookup table.",
          "It guarantees deterministic outputs.",
        ],
        answer: 1,
        explain:
          "CAI uses a written constitution so the model learns to self-critique against principles (AI feedback) rather than depending solely on human-labeled examples.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────── 02
  {
    id: "models",
    title: "Claude models & model selection",
    eyebrow: "Capabilities",
    est: "50 min",
    summary:
      "The current model lineup, the tier philosophy, capability dimensions, and how to choose (and route between) models for cost, latency, and quality.",
    lessons: [
      {
        id: "tiers",
        title: "The tier philosophy: Haiku, Sonnet, Opus — and above",
        body: `Since Claude 3 (March 2024), Anthropic organizes models into three named size tiers, and in 2026 added a frontier tier above them:

- **Haiku** — fastest and cheapest. Built for high-volume, latency-sensitive work: classification, routing, extraction, cheap subagents.
- **Sonnet** — the balanced default. Near-frontier coding and reasoning at a fraction of Opus cost. Start here for most workloads.
- **Opus** — maximum capability in the mainstream line. Reach for it on complex, multi-step, high-stakes work where a mistake is expensive.
- **Mythos-class (Fable / Mythos)** — a frontier tier introduced in 2026 that sits *above* Opus. Fable 5 is the safeguarded, generally available member; Mythos 5 is the less-restricted, limited-availability sibling.

The naming is \`generation.version\` — e.g., the "4" is the architecture generation and ".6" / ".8" are capability increments within it. "Haiku/Sonnet/Opus" name the tier, not the generation.`,
        callout:
          "Default to Sonnet. Move down to Haiku for volume/latency, up to Opus/Fable for hard, high-stakes reasoning.",
      },
      {
        id: "lineup-2026",
        title: "The current lineup (June 2026)",
        body: `As of June 2026 the production lineup and approximate API pricing (per million tokens, input / output):

- **Claude Fable 5** — \`claude-fable-5\` — ~\\$10 / \\$50. First publicly available Mythos-class model; the most capable Anthropic has released. Always-on adaptive thinking, 1M context. A safety classifier routes high-risk requests (cybersecurity, biology, chemistry, distillation) to an Opus 4.8 fallback.
- **Claude Opus 4.8** — \`claude-opus-4-8\` — ~\\$5 / \\$25. The current Opus-tier workhorse; strong default for serious agentic coding and high-autonomy work. Supports zero-data-retention (ZDR).
- **Claude Sonnet 4.6** — \`claude-sonnet-4-6\` — ~\\$3 / \\$15. Best balance of capability, speed, and cost for most use cases.
- **Claude Haiku 4.5** — \`claude-haiku-4-5-20251001\` — ~\\$1 / \\$5. Fastest and cheapest.

Two notes that matter for architects. First, Mythos-class access (Fable 5 and Mythos 5) was suspended in mid-June 2026 to comply with a U.S. export-control directive; all other models remained available. Always verify current availability. Second, **pin full versioned model strings in production** — generic aliases can silently resolve to new models and change your app's behavior.`,
        code: `// Always pin explicit, versioned model strings in production.
const MODELS = {
  cheap:   "claude-haiku-4-5-20251001", // classification, routing
  default: "claude-sonnet-4-6",         // most app logic
  hard:    "claude-opus-4-8",           // complex agentic / high-stakes
  frontier:"claude-fable-5",            // verify availability before relying on it
};

// Anti-pattern: an unversioned alias may change models under you.
// const model = "claude-sonnet"; // ❌ avoid in production`,
        callout:
          "Pin versioned model IDs. An unpinned alias is a silent dependency that can change behavior without a deploy.",
      },
      {
        id: "capabilities",
        title: "Capability dimensions",
        body: `Models differ along several axes beyond raw "smartness." Reason about each one explicitly:

- **Reasoning depth / extended thinking** — newer models can think step-by-step before answering. Frontier models run adaptive thinking by default. Better for math, multi-step planning, and verification; costs more tokens and latency.
- **Context window** — up to 1M tokens on current models (some tiers 200K). Governs how much you can feed in one call.
- **Output length** — max output tokens (e.g., 64K+, with batch beta extending further). Matters for long-form generation.
- **Vision** — all current models accept image input. Useful for document understanding, screenshots, charts.
- **Tool use / computer use / browser use** — degree to which the model can reliably call tools, operate software, and drive a browser. Improves up the tiers.
- **Latency** — Haiku is fastest; frontier reasoning models can take seconds to minutes on hard tasks.

There's no single "best" model — only the best fit for a task's quality bar, budget, and latency envelope.`,
      },
      {
        id: "routing",
        title: "Model routing in production",
        body: `Mature systems rarely use one model. They **route**: send each request to the cheapest model that can meet the quality bar, escalating only when needed.

Common patterns:
- **Tiered routing** — a cheap model (Haiku) classifies or attempts first; escalate to Sonnet/Opus on low confidence or failed validation.
- **Role-based** — Haiku for extraction/classification subtasks, Sonnet for user-facing generation, Opus/Fable for the hard reasoning core.
- **Multi-agent** — frontier model as orchestrator, cheap models as the many parallel subagents.

This is one of the highest-leverage cost levers you have. A naive "Opus for everything" system can often be made 5–10× cheaper with no quality loss by routing the easy 80% to Haiku/Sonnet.`,
        code: `async function route(task) {
  // 1) Cheap model triages difficulty
  const triage = await call(MODELS.cheap, classifyDifficultyPrompt(task));
  // 2) Escalate based on the triage result
  if (triage.difficulty === "trivial")  return call(MODELS.cheap, task);
  if (triage.difficulty === "moderate") return call(MODELS.default, task);
  return call(MODELS.hard, task); // reserve Opus/Fable for the genuinely hard tail
}`,
        callout:
          "Routing is the #1 cost lever. Pay frontier prices only for the requests that actually need frontier capability.",
      },
    ],
    quiz: [
      {
        q: "For a high-volume support-ticket classifier needing sub-second responses on millions of calls, which model is the natural starting point?",
        options: ["Fable 5", "Opus 4.8", "Sonnet 4.6", "Haiku 4.5"],
        answer: 3,
        explain:
          "Haiku is the fast, cheap tier built precisely for high-volume, latency-sensitive classification and routing.",
      },
      {
        q: "Why should production code pin a versioned model string like 'claude-sonnet-4-6' rather than a bare alias?",
        options: [
          "Versioned strings are cheaper.",
          "Unversioned aliases can silently resolve to a new model and change app behavior.",
          "Aliases don't support tool use.",
          "It's required for vision to work.",
        ],
        answer: 1,
        explain:
          "Generic aliases may point to different models over time as defaults update, silently changing behavior. Pin explicit versions in production.",
      },
      {
        q: "What distinguishes Fable 5 from Mythos 5 within the Mythos-class tier?",
        options: [
          "Fable 5 is faster but less capable.",
          "Fable 5 ships with safety classifiers that route high-risk requests to an Opus fallback; Mythos 5 lacks them and is limited-availability.",
          "Mythos 5 has a larger context window.",
          "They are identical; only the names differ for marketing.",
        ],
        answer: 1,
        explain:
          "They share the underlying capability, but Fable 5 adds safety classifiers (routing flagged domains to Opus 4.8) and is the GA member; Mythos 5 is the less-restricted, limited-access sibling.",
      },
      {
        q: "A system uses Opus 4.8 for every request, including trivial ones, and costs are too high. Best first move?",
        options: [
          "Switch everything to Fable 5.",
          "Reduce the context window limit.",
          "Introduce model routing so cheap requests go to Haiku/Sonnet and only hard ones reach Opus.",
          "Disable extended thinking globally.",
        ],
        answer: 2,
        explain:
          "Routing the easy majority of traffic to cheaper tiers, reserving Opus for the hard tail, is the highest-leverage cost optimization.",
      },
    ],
  },
];
