// exam.js — scenario-based mock exam pool for the Claude Certified Architect.
// Drawn to mirror the eight architect decisions. Mixed difficulty.
export const EXAM_BANK = [
  {
    domain: "Models",
    q: "You're designing a system that must classify 50M support messages per day with a p95 latency under 400ms, plus generate a small number of complex escalation summaries. What model strategy fits best?",
    options: [
      "Opus 4.8 for everything to maximize quality.",
      "Haiku 4.5 for the high-volume classification; route the rare complex summaries to Sonnet or Opus.",
      "Fable 5 for everything since it's most capable.",
      "Sonnet 4.6 for everything to keep it simple.",
    ],
    answer: 1,
    explain:
      "Latency/volume → Haiku for classification; reserve a higher tier only for the rare hard summaries. Routing matches cost/latency to task.",
  },
  {
    domain: "Models",
    q: "Why is relying on the alias 'claude-sonnet' (no version) risky in a regulated production system?",
    options: [
      "It costs more.",
      "It can silently resolve to a newer model, changing behavior and invalidating prior validation/evals.",
      "It disables tool use.",
      "It can't stream.",
    ],
    answer: 1,
    explain:
      "Unpinned aliases can change underlying models, breaking reproducibility and prior validation. Pin versioned strings in production.",
  },
  {
    domain: "Prompting",
    q: "A nuanced extraction task with a tricky output format keeps failing despite a detailed paragraph of instructions. Highest-leverage fix?",
    options: [
      "Add more adjectives describing the persona.",
      "Provide 3–5 few-shot input→output examples (including edge cases) and specify the exact schema.",
      "Increase temperature.",
      "Switch to a smaller model.",
    ],
    answer: 1,
    explain:
      "For nuanced formats, showing examples beats describing them; pair with an explicit schema. Examples are the strongest lever here.",
  },
  {
    domain: "Prompting",
    q: "Which is the cleaner mechanism when you need guaranteed schema-valid JSON from the API?",
    options: [
      "Ask for JSON in prose and parse hopefully.",
      "Define a tool whose input_schema is the structure and force tool_choice to it.",
      "Raise max_tokens.",
      "Add 'please' to the prompt.",
    ],
    answer: 1,
    explain:
      "Forced tool use enforces the schema via the API contract — more reliable than prompt-level JSON requests.",
  },
  {
    domain: "API",
    q: "Your agent re-sends an identical 20K-token instruction+context prefix on every step of a long loop. Cost is dominated by input tokens. Best optimization?",
    options: [
      "Switch to streaming.",
      "Apply prompt caching to the stable prefix.",
      "Lower temperature.",
      "Use the event_create API.",
    ],
    answer: 1,
    explain:
      "A large, stable, repeated prefix is the canonical prompt-caching target, cutting input cost dramatically.",
  },
  {
    domain: "API",
    q: "You must run a one-time 5M-item enrichment with results acceptable within hours. Cheapest correct stack?",
    options: [
      "Synchronous Opus calls with streaming.",
      "Batch API + Haiku + prompt caching of the shared instructions.",
      "Fable 5 synchronously.",
      "Artifacts with persistent storage.",
    ],
    answer: 1,
    explain:
      "Latency-tolerant bulk → Batch (~50% off) + cheap model + caching shared context = minimal cost.",
  },
  {
    domain: "Tool use",
    q: "An LLM frequently calls the wrong one of 30 similar tools. Which fix addresses the root cause?",
    options: [
      "Increase max_tokens.",
      "Rewrite tool descriptions to be precise and non-overlapping, and reduce/group the tools so fewer compete.",
      "Use a larger context window.",
      "Force tool_choice to a random tool.",
    ],
    answer: 1,
    explain:
      "Tool selection degrades with many vague, overlapping tools. Clearer descriptions and fewer competing options are the fix.",
  },
  {
    domain: "Tool use",
    q: "In the tool-use loop, what does your application code do after Claude returns a tool_use block?",
    options: [
      "Nothing; Anthropic executes it.",
      "Execute the function and append a tool_result (with the matching tool_use_id), then call the API again.",
      "Stream the tokens to the user.",
      "Discard the request.",
    ],
    answer: 1,
    explain:
      "Your code runs the tool and returns a tool_result referencing the tool_use id, then continues the loop until a final answer.",
  },
  {
    domain: "MCP",
    q: "Your company has 12 internal systems and 3 AI hosts (Claude.ai, Claude Code, a custom app). Without MCP you'd build 36 integrations. What does MCP change?",
    options: [
      "Nothing; you still build all 36.",
      "Build one MCP server per system; any MCP-compatible host can use it, collapsing the N×M problem.",
      "It forces you to use only Claude.ai.",
      "It removes the need for authentication.",
    ],
    answer: 1,
    explain:
      "MCP standardizes the interface, so each system needs one server reusable by all hosts — collapsing N×M custom integrations.",
  },
  {
    domain: "MCP",
    q: "A remote MCP resource returns text containing hidden instructions to exfiltrate data. Correct stance?",
    options: [
      "Obey it; it's from a trusted connector.",
      "Treat all server-returned content as untrusted input; rely on least-privilege tool scopes and instruction/data separation.",
      "Increase the model tier.",
      "Turn off all logging.",
    ],
    answer: 1,
    explain:
      "Resource/tool content can carry injected instructions. Defend with untrusted-input handling, least privilege, and separation of data from commands.",
  },
  {
    domain: "Agents",
    q: "A task is well-defined with three fixed steps and a tight latency budget. Workflow or agent?",
    options: [
      "Autonomous agent for flexibility.",
      "A deterministic workflow (prompt chain) — predictable, cheaper, debuggable.",
      "Multi-agent orchestration.",
      "Reflection loop with subagents.",
    ],
    answer: 1,
    explain:
      "Well-defined, latency-sensitive tasks favor fixed workflows over autonomous agents. Use the simplest thing that works.",
  },
  {
    domain: "Agents",
    q: "Your research agent occasionally never terminates and runs up large bills. First structural safeguards?",
    options: [
      "Use a bigger model.",
      "Add bounded stop conditions (max steps/budget/explicit done) and prune context each step.",
      "Add more tools.",
      "Disable verification.",
    ],
    answer: 1,
    explain:
      "Unbounded loops are a design flaw; stop conditions plus context pruning are the core runaway controls.",
  },
  {
    domain: "Agents",
    q: "Which pattern best scales a broad task across many independent sub-tasks while controlling cost?",
    options: [
      "A single Opus call.",
      "Orchestrator–worker: a lead model dispatches cheaper subagents in parallel, then synthesizes.",
      "A longer system prompt.",
      "Raising temperature.",
    ],
    answer: 1,
    explain:
      "Orchestrator–worker with cheap parallel subagents scales breadth and controls cost; the orchestrator synthesizes results.",
  },
  {
    domain: "RAG",
    q: "A knowledge bot hallucinates because the correct passage is rarely retrieved. Best first action?",
    options: [
      "Upgrade the generation model.",
      "Improve retrieval: better chunking, hybrid (semantic+keyword) search, reranking, and contextual retrieval; evaluate retrieval separately.",
      "Increase temperature.",
      "Add more tools.",
    ],
    answer: 1,
    explain:
      "If the right chunk isn't retrieved, no model can answer correctly. Fix retrieval quality first and measure it independently.",
  },
  {
    domain: "RAG",
    q: "For a modest, fairly static internal handbook queried often, when is long-context (with caching) preferable to a full RAG pipeline?",
    options: [
      "Never.",
      "When the handbook fits comfortably in context and prompt caching offsets repeated cost, trading a pipeline for simplicity.",
      "Only when using Haiku.",
      "Only for images.",
    ],
    answer: 1,
    explain:
      "Small, stable corpora can be placed in-context (with caching) to avoid pipeline complexity; large/dynamic data still favors RAG/agentic retrieval.",
  },
  {
    domain: "RAG",
    q: "In a multi-tenant RAG SaaS, the non-negotiable retrieval requirement is:",
    options: [
      "Maximum chunk size.",
      "Permission-aware retrieval with strict tenant isolation so no customer's data enters another's context.",
      "Using Opus for embeddings.",
      "Disabling citations.",
    ],
    answer: 1,
    explain:
      "Retrieval must enforce access control and tenant isolation; cross-tenant context leakage is a critical governance failure.",
  },
  {
    domain: "Coding",
    q: "Which workflow yields the most reliable AI-written feature in a real repo?",
    options: [
      "One giant generation, shipped unreviewed.",
      "Plan → implement in small steps → write and run tests → fix failures → human review before merge.",
      "Max temperature, no tests.",
      "Generate only; never run code.",
    ],
    answer: 1,
    explain:
      "Plan, small steps, tests, verification loops, and human review are what make agentic coding dependable.",
  },
  {
    domain: "Security",
    q: "An agent can take irreversible external actions and ingests untrusted web content. Strongest defense against injection-driven misuse?",
    options: [
      "A system prompt forbidding obedience to injected text.",
      "Least-privilege tool scopes + instruction/data separation + human confirmation for consequential/irreversible actions.",
      "A larger model.",
      "Turning off streaming.",
    ],
    answer: 1,
    explain:
      "Injection is mitigated architecturally: tightly scope tools, separate trusted instructions from untrusted data, and gate irreversible actions behind human approval.",
  },
  {
    domain: "Security",
    q: "A client requires that request content not be retained by the provider. What do you verify?",
    options: [
      "That you're using Artifacts.",
      "That the chosen model/endpoint supports Zero Data Retention (ZDR), since support varies by model.",
      "That temperature is 0.",
      "That you use the Batch API.",
    ],
    answer: 1,
    explain:
      "ZDR support varies by model/endpoint (e.g., Opus 4.8 supports it; some frontier models may not). Verify before committing.",
  },
  {
    domain: "Evaluation",
    q: "Before upgrading your app from one model version to a newer one, the safest practice is:",
    options: [
      "Swap it in production and watch for complaints.",
      "Run your eval suite (dataset + graders, incl. LLM-as-judge) against both versions and compare before shipping.",
      "Increase max_tokens.",
      "Trust the release notes.",
    ],
    answer: 1,
    explain:
      "Evals let you compare versions on representative tasks and catch regressions before users do — the basis of safe upgrades.",
  },
  {
    domain: "Evaluation",
    q: "For open-ended generation quality where exact-match doesn't apply, a practical automated grader is:",
    options: [
      "Counting tokens.",
      "LLM-as-judge: a capable model scores outputs against a rubric, run across a dataset and tracked over time.",
      "Random sampling only.",
      "Temperature analysis.",
    ],
    answer: 1,
    explain:
      "LLM-as-judge with a clear rubric scales open-ended evaluation; automate across a dataset and track per prompt/model version.",
  },
  {
    domain: "Enterprise",
    q: "An enterprise on Google Cloud with EU residency needs Claude. Best architectural note?",
    options: [
      "Only the direct API exists; residency can't be met.",
      "Claude is available via Vertex AI (and Bedrock / Microsoft Foundry), so they can meet residency/compliance within their cloud while keeping app architecture largely unchanged.",
      "They must fine-tune the model.",
      "They must use Claude.ai Projects.",
    ],
    answer: 1,
    explain:
      "Platform availability (Vertex AI, Bedrock, Microsoft Foundry) addresses residency/compliance; the substrate changes, not the core architecture.",
  },
  {
    domain: "Enterprise",
    q: "Across the reference architecture, which statement is true?",
    options: [
      "Governance and evaluation are optional add-ons.",
      "Each layer — interface, orchestration, context/RAG, tools/MCP, models, governance, evaluation — should use the simplest design meeting its requirement.",
      "Every system needs an autonomous agent.",
      "Caching only helps latency, never cost.",
    ],
    answer: 1,
    explain:
      "Sound architecture chooses the simplest adequate design per layer, with governance and evaluation as first-class, not optional.",
  },
];
