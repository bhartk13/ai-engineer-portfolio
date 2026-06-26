// curriculum-2.js — modules 03–06
export const MODULES_2 = [
  // ───────────────────────────────────────────────────────── 03
  {
    id: "prompting",
    title: "Prompt engineering",
    eyebrow: "Core skill",
    est: "70 min",
    summary:
      "The techniques that reliably move quality: clarity, structure, examples, roles, step-by-step reasoning, structured output, and extended thinking.",
    lessons: [
      {
        id: "principles",
        title: "The principles that actually matter",
        body: `Prompt engineering is not incantation — it's clear technical communication with a capable but literal collaborator. The highest-impact moves, in order:

1. **Be clear and specific.** State the task, the audience, the format, the constraints, and what "done" looks like. Vague prompts get vague answers.
2. **Give context.** Why does this task exist? Who reads the output? What's the surrounding system? Context lets Claude make better judgment calls.
3. **Use examples (few-shot).** Showing 2–5 input→output pairs is often more effective than paragraphs of instructions. Include edge cases and counter-examples.
4. **Ask for step-by-step reasoning** on complex tasks ("think through this before answering"). It improves accuracy on math, logic, and multi-step work.
5. **Specify output format** explicitly — JSON schema, XML tags, length, structure.
6. **Use structural delimiters.** Claude responds well to XML-style tags (\`<document>\`, \`<instructions>\`) to separate parts of a prompt.

These compound. A prompt that is clear, contextual, exemplified, and structured outperforms a clever one-liner almost every time.`,
        callout:
          "Clarity > cleverness. Most 'the model can't do this' problems are underspecified prompts.",
      },
      {
        id: "system-prompts",
        title: "System prompts & roles",
        body: `The **system prompt** sets persistent behavior, persona, rules, and context for the whole conversation. It's separate from user turns and is where you encode the model's role and the non-negotiable rules of your application.

Put in the system prompt: the role ("You are a senior tax analyst..."), tone, output conventions, hard constraints, and any always-true context. Keep per-request specifics in the user message.

A strong system prompt is concrete about *behavior*, not just identity. "You are helpful" does little; "Answer in at most 3 sentences, cite the source section in brackets, and say 'I don't know' rather than guess" does a lot.`,
        code: `const system = \`You are a contracts analyst for a SaaS company.
Rules:
- Answer only from the provided contract text in <contract>.
- If the contract is silent on a question, reply exactly: "Not specified in contract."
- Quote the relevant clause number in brackets, e.g. [§4.2].
- Be concise: no preamble.\`;

const messages = [{ role: "user", content: "<contract>...</contract>\\n\\nWhat is the notice period for termination?" }];`,
        callout:
          "System prompt = durable rules & role. User message = the specific task. Don't mix them.",
      },
      {
        id: "structured-output",
        title: "Structured output & prefilling",
        body: `When your code needs to parse Claude's output, don't hope for clean JSON — engineer it:

- **Specify the exact schema** in the prompt and instruct "Respond with only valid JSON, no markdown, no preamble."
- **Prefill the assistant turn.** You can start Claude's response for it (e.g., begin with \`{\`) to force it into the structure and skip chatter.
- **Use XML tags** to demarcate fields when JSON is awkward, then extract by tag.
- **Validate and retry.** Parse defensively; on failure, send the error back and ask for a correction.

Tool use (next module) is often the *cleaner* path to structured data because the schema is enforced by the API — but prompt-level structuring remains essential.`,
        code: `// Prefilling: seed the assistant's reply to force JSON
const messages = [
  { role: "user", content: "Extract name and email as JSON." },
  { role: "assistant", content: "{" }   // ← prefill forces structure
];
// Claude continues from "{", so you get: { "name": "...", "email": "..." }`,
      },
      {
        id: "thinking",
        title: "Extended thinking & reasoning control",
        body: `Newer Claude models support **extended thinking**: an explicit reasoning phase before the final answer. On frontier models it can be always-on and adaptive. You can request more or less reasoning effort depending on the task.

Use more thinking for: multi-step math, planning, debugging, anything where the model tends to "answer too fast." Use less for: simple, latency-sensitive calls where reasoning is wasted cost.

Architect's caution: extended thinking improves quality but costs tokens and latency. Don't enable maximum reasoning globally — match effort to task difficulty, the same way you match model tier to task.`,
        callout:
          "Reasoning effort is a dial, not a switch. More isn't free — tune it per task like you tune model choice.",
      },
      {
        id: "antipatterns",
        title: "Prompting anti-patterns",
        body: `Common ways prompts go wrong:

- **Over-constraining tone, under-constraining substance** — pages on persona, nothing on the actual deliverable.
- **Conflicting instructions** — "be thorough" and "be brief" with no priority.
- **Burying the task** — the real question is in paragraph 6. Lead with it.
- **Asking for what the model can't verify** — "never be wrong." Instead, ask it to flag uncertainty.
- **No examples for nuanced tasks** — describing a tricky format instead of showing it.
- **Treating prompts as static** — not iterating against real outputs. Prompts are engineered artifacts; test and version them.`,
      },
    ],
    quiz: [
      {
        q: "You need Claude's output parsed reliably by code. Which combination is strongest?",
        options: [
          "A longer persona description.",
          "Specify an exact JSON schema, instruct 'only valid JSON', and prefill the assistant turn with '{'; validate and retry on failure.",
          "Ask politely for JSON and hope.",
          "Raise the temperature.",
        ],
        answer: 1,
        explain:
          "Explicit schema + 'only JSON' + prefilling + defensive parse/retry is the reliable structured-output pattern. (Tool use is an even stronger option where applicable.)",
      },
      {
        q: "What belongs in the system prompt vs. the user message?",
        options: [
          "Everything goes in the user message.",
          "Durable role, rules, tone, and always-true context go in the system prompt; the specific task goes in the user message.",
          "The system prompt is only for the model name.",
          "They're interchangeable.",
        ],
        answer: 1,
        explain:
          "System prompts encode persistent behavior and constraints; user messages carry the specific request.",
      },
      {
        q: "When is extended thinking the WRONG default?",
        options: [
          "On multi-step math problems.",
          "On simple, high-volume, latency-sensitive calls where reasoning adds cost without value.",
          "On debugging tasks.",
          "On planning tasks.",
        ],
        answer: 1,
        explain:
          "Extended thinking adds tokens and latency. For simple high-throughput calls it's wasted; match reasoning effort to difficulty.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────── 04
  {
    id: "projects-artifacts",
    title: "Projects, Artifacts & Claude.ai features",
    eyebrow: "Claude.ai",
    est: "40 min",
    summary:
      "The consumer-app building blocks: Projects for persistent knowledge and instructions, Artifacts for generated apps and documents, and connectors.",
    lessons: [
      {
        id: "projects",
        title: "Projects: persistent context",
        body: `A **Project** in Claude.ai bundles a set of conversations with shared **knowledge** (uploaded files / reference material) and **custom instructions**. Everything you chat about in the project has that knowledge and those instructions available without re-pasting.

Architecturally, a Project is a lightweight, no-code retrieval + system-prompt container. Use it when a person or team repeatedly works against the same body of material (a codebase's docs, a style guide, a contract set) and wants consistent behavior.

Project knowledge is the consumer-grade cousin of RAG: you get grounding in your documents without building a pipeline. For larger or more dynamic corpora, you graduate to a real retrieval system (later module).`,
        callout:
          "Projects = reusable knowledge + instructions. The no-code on-ramp to grounded, consistent assistance.",
      },
      {
        id: "artifacts",
        title: "Artifacts: generated apps & documents",
        body: `**Artifacts** are substantial, self-contained outputs Claude renders in a side panel: a React app, an HTML page, an SVG, a document, a data dashboard. They're editable and iterable — you refine by chatting.

Artifacts can be interactive and even **AI-powered**: an artifact can call the Anthropic API itself (sometimes called "Claude in Claude"), so you can build, e.g., a quiz app whose questions are generated live, or a tool that summarizes pasted text. Artifacts can persist data across sessions via a key-value storage API, enabling trackers, journals, and small tools.

For an architect, Artifacts are the fastest path from idea to a working, shareable prototype — no deployment, no repo. The natural progression is: prototype as an Artifact → graduate to a real codebase (often via Claude Code) when you need version control, auth, and scale.`,
        callout:
          "Artifacts are prototype-grade superpowers: interactive, persistable, even self-calling the API. Great for proving an idea fast.",
      },
      {
        id: "connectors",
        title: "Connectors & the broader app",
        body: `Claude.ai connects to external tools and data through **connectors** (built on MCP, covered later). A connector lets Claude read your calendar, search a drive, or act in a third-party app — with your permission, per chat.

Other surface features worth knowing as an architect because users will ask about them: web search and research modes, the ability to search and reference past chats, memory generated from chat history, and styles/preferences for customizing tone and formatting. These are product features, not API primitives — but they shape what users expect a "Claude app" to do, and several have API equivalents you'll build yourself.`,
      },
    ],
    quiz: [
      {
        q: "A consulting team keeps re-pasting the same brand guidelines and wants consistent tone across many chats with zero engineering. Best Claude.ai feature?",
        options: [
          "A one-off long prompt each time.",
          "A Project with the guidelines as knowledge and tone rules as custom instructions.",
          "An Artifact.",
          "The Batch API.",
        ],
        answer: 1,
        explain:
          "Projects bundle persistent knowledge + custom instructions across conversations — the no-code way to get grounded, consistent behavior.",
      },
      {
        q: "Which best describes an Artifact's capabilities?",
        options: [
          "A static text reply only.",
          "A self-contained, editable output (app/doc/SVG) that can be interactive, persist data across sessions, and even call the Anthropic API.",
          "A billing report.",
          "A model version string.",
        ],
        answer: 1,
        explain:
          "Artifacts are substantial, iterable outputs that can be interactive, persist via key-value storage, and even be AI-powered by calling the API.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────── 05
  {
    id: "api",
    title: "The Claude API & developer platform",
    eyebrow: "Build",
    est: "75 min",
    summary:
      "The Messages API, streaming, system prompts in code, vision, the Files API, prompt caching, and the Batch API — the primitives you build products on.",
    lessons: [
      {
        id: "messages",
        title: "The Messages API",
        body: `The core endpoint is **Messages**. You send a model, a system prompt, and a list of messages (alternating user/assistant turns), and receive a response with content blocks.

Key request fields: \`model\`, \`max_tokens\` (cap on output), \`system\`, \`messages\`, \`temperature\` (randomness; lower = more deterministic), and optional \`tools\`, \`stop_sequences\`, and thinking controls.

The response \`content\` is an array of blocks — text, tool-use, thinking — not a single string. Always handle it as structured content, especially once tools are involved.`,
        code: `import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY

const res = await client.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  system: "You are a concise assistant.",
  messages: [{ role: "user", content: "Explain prompt caching in 2 sentences." }],
});

// content is an array of blocks — find the text blocks
const text = res.content.filter(b => b.type === "text").map(b => b.text).join("\\n");
console.log(text);`,
        callout:
          "Response.content is an array of typed blocks. Parse by type — never assume content[0] is your text.",
      },
      {
        id: "streaming",
        title: "Streaming & responsiveness",
        body: `For anything user-facing, **stream** the response so tokens appear as they're generated instead of after a long wait. Streaming uses server-sent events; the SDK exposes it as an async iterator.

Streaming doesn't change cost or total latency to completion, but it transforms *perceived* latency — critical for chat UIs. Combine with a fast model for the first response and you get snappy products.`,
        code: `const stream = await client.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Write a haiku about caching." }],
});
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text); // render incrementally
  }
}`,
      },
      {
        id: "vision-files",
        title: "Vision & the Files API",
        body: `All current models accept **image input**. You pass images as base64 or via the **Files API**, which lets you upload a file once and reference it across calls — efficient for PDFs and images you reuse.

Vision use cases: document understanding (invoices, forms), chart/screenshot interpretation, UI analysis. For PDFs you can send the document directly and ask questions over it. The Files API also underpins workflows where Claude reads or produces files.`,
        code: `// Image input via base64
const messages = [{
  role: "user",
  content: [
    { type: "image", source: { type: "base64", media_type: "image/png", data: b64 } },
    { type: "text", text: "What value is in the 'Total' field?" },
  ],
}];`,
      },
      {
        id: "caching",
        title: "Prompt caching",
        body: `**Prompt caching** lets you mark a large, stable prefix (a long system prompt, a big document, few-shot examples) to be cached on Anthropic's side. Subsequent calls that reuse that prefix are far cheaper and faster on the cached portion — savings can reach ~90% on the cached tokens.

This is one of the most important cost levers for RAG and agents, where the same instructions/context are sent repeatedly. Design your prompts so the stable part comes first (cacheable) and the variable part comes last.`,
        code: `// Mark a stable prefix as cacheable (conceptual)
const system = [
  { type: "text", text: BIG_STABLE_INSTRUCTIONS, cache_control: { type: "ephemeral" } },
];
// Reusing this exact prefix across calls hits the cache → cheaper + faster.`,
        callout:
          "Put stable content first and cache it. For repeated-context workloads, caching can cut cost ~90% on the cached prefix.",
      },
      {
        id: "batch",
        title: "The Batch API",
        body: `The **Batch API** processes large volumes of requests asynchronously at a significant discount (commonly ~50% off) with higher throughput, in exchange for non-immediate results (returned within a window rather than instantly).

Use it for offline jobs: bulk classification, dataset labeling, evaluation runs, embeddings generation, mass content processing. Pair batch + caching + Haiku and large back-office workloads become remarkably cheap.`,
        callout:
          "For non-realtime bulk work, Batch (≈50% off) + Haiku + caching is the canonical cost-minimizing stack.",
      },
    ],
    quiz: [
      {
        q: "A RAG app sends the same 8,000-token instruction-and-policy prefix on every call. Cheapest correct optimization?",
        options: [
          "Switch to Fable 5.",
          "Use prompt caching on the stable prefix so repeated tokens are billed at a steep discount.",
          "Remove the system prompt.",
          "Lower max_tokens.",
        ],
        answer: 1,
        explain:
          "A large, stable, repeated prefix is the ideal prompt-caching target — up to ~90% savings on the cached portion.",
      },
      {
        q: "You must label 2 million records overnight with no realtime requirement. Best approach?",
        options: [
          "Stream each one synchronously on Opus.",
          "Use the Batch API (≈50% discount, async) with a cheap model like Haiku.",
          "Use Artifacts.",
          "Use Projects.",
        ],
        answer: 1,
        explain:
          "Bulk, latency-tolerant jobs are exactly what the Batch API is for; pairing it with Haiku minimizes cost further.",
      },
      {
        q: "Why must you treat the Messages API response 'content' as an array of typed blocks?",
        options: [
          "Because it's always exactly one text block.",
          "Because responses can contain multiple block types (text, tool_use, thinking); you extract by type rather than assuming position.",
          "Because content is encrypted.",
          "Because streaming requires it.",
        ],
        answer: 1,
        explain:
          "Responses are structured: filtering/handling by block type is essential, especially with tools and thinking enabled.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────── 06
  {
    id: "tool-use",
    title: "Tool use (function calling)",
    eyebrow: "Extending Claude",
    est: "60 min",
    summary:
      "How Claude calls your functions: tool schemas, the request/response loop, parallel tools, forced tools, and designing tools an LLM can use reliably.",
    lessons: [
      {
        id: "concept",
        title: "What tool use is",
        body: `**Tool use** (a.k.a. function calling) lets Claude invoke functions you define. You describe each tool with a name, description, and JSON-schema input. When Claude decides a tool is needed, it returns a \`tool_use\` block with arguments. *Your code* executes the function and sends the result back as a \`tool_result\`. Claude then continues, possibly calling more tools, until it produces a final answer.

Crucial mental model: **Claude never runs your code.** It only emits structured requests to call tools; you remain in control of execution. This is what makes tools both powerful and safe to govern.

Tool use is how Claude reaches beyond its training data and text-only nature: fetching live data, doing exact math, querying your database, taking actions in other systems.`,
        callout:
          "Claude requests tool calls; your code executes them. That boundary is your security and control surface.",
      },
      {
        id: "loop",
        title: "The tool-use loop",
        body: `The lifecycle of a tool-augmented turn:

1. You send messages **plus** a \`tools\` array (schemas).
2. Claude responds. If it wants a tool, the response \`stop_reason\` is \`tool_use\` and includes a tool-use block with an \`id\` and \`input\`.
3. Your code runs the function and appends a \`tool_result\` block (referencing that \`id\`) as a new user turn.
4. You call the API again with the updated message history.
5. Repeat until Claude returns a normal text answer.

You manage this loop. Agents (later) are essentially this loop generalized with planning, memory, and many tools.`,
        code: `const tools = [{
  name: "get_weather",
  description: "Get current temperature for a city.",
  input_schema: {
    type: "object",
    properties: { city: { type: "string", description: "City name" } },
    required: ["city"],
  },
}];

let messages = [{ role: "user", content: "What's the weather in Paris?" }];
let res = await client.messages.create({ model: MODEL, max_tokens: 512, tools, messages });

while (res.stop_reason === "tool_use") {
  const call = res.content.find(b => b.type === "tool_use");
  const result = await runTool(call.name, call.input);   // YOUR code executes
  messages.push({ role: "assistant", content: res.content });
  messages.push({ role: "user", content: [
    { type: "tool_result", tool_use_id: call.id, content: JSON.stringify(result) },
  ]});
  res = await client.messages.create({ model: MODEL, max_tokens: 512, tools, messages });
}`,
      },
      {
        id: "design",
        title: "Designing tools an LLM can use",
        body: `Tool reliability is mostly a *design* problem, not a model problem:

- **Name and describe tools for a reader, not a compiler.** The description is a prompt. Say what the tool does, when to use it, and what it returns.
- **Make inputs unambiguous.** Use enums, clear field descriptions, required vs. optional. Constrain to prevent invalid calls.
- **Keep tools focused.** One job each. A sprawling "do_everything" tool confuses the model.
- **Return structured, informative results** — including useful error messages so Claude can recover and retry intelligently.
- **Mind the count.** Dozens of overlapping tools degrade selection; group or gate them.

Features that help: **parallel tool use** (Claude can request several tools at once when independent) and **forced tool choice** (require a specific tool or any tool — useful for guaranteeing structured output).`,
        callout:
          "A tool's description is a prompt. Ambiguous schemas and overlapping tools cause most tool-use failures.",
      },
      {
        id: "structured-via-tools",
        title: "Tools as a structured-output mechanism",
        body: `A powerful pattern: define a single tool whose \`input_schema\` *is* the structure you want, then force the model to call it. The API enforces the schema, giving you clean, typed data without prompt-and-pray JSON parsing.

This is often the most reliable way to extract structured data — classification labels, entities, form fields — because validity is guaranteed by the tool contract rather than by the model's formatting discipline.`,
        code: `const tools = [{
  name: "record_sentiment",
  description: "Record the sentiment classification of the text.",
  input_schema: {
    type: "object",
    properties: {
      sentiment: { type: "string", enum: ["positive","neutral","negative"] },
      confidence: { type: "number" },
    },
    required: ["sentiment","confidence"],
  },
}];
// Force the tool so output is guaranteed to match the schema:
const res = await client.messages.create({
  model: MODEL, max_tokens: 256, tools,
  tool_choice: { type: "tool", name: "record_sentiment" },
  messages: [{ role: "user", content: "Honestly the best purchase I've made all year." }],
});`,
      },
    ],
    quiz: [
      {
        q: "In tool use, who actually executes the function Claude 'calls'?",
        options: [
          "Anthropic's servers run it automatically.",
          "Your application code executes it and returns a tool_result; Claude only emits a structured request.",
          "The model runs it in a sandbox.",
          "It's executed by the Batch API.",
        ],
        answer: 1,
        explain:
          "Claude emits a tool_use request with arguments; your code runs the function and returns the result. That boundary is the core control/security surface.",
      },
      {
        q: "Most reliable way to get schema-valid structured output?",
        options: [
          "Ask nicely for JSON in the prompt.",
          "Define a tool whose input_schema is the desired structure and force tool_choice to that tool.",
          "Raise temperature.",
          "Use streaming.",
        ],
        answer: 1,
        explain:
          "Forcing a tool call whose input_schema is your target structure makes the API enforce validity — stronger than prompt-level JSON requests.",
      },
      {
        q: "A tool-use agent keeps picking the wrong tool among 40 similar tools. Best fix?",
        options: [
          "Switch to Haiku.",
          "Improve/clarify tool descriptions, reduce overlap, and group or gate tools so fewer compete at once.",
          "Increase max_tokens.",
          "Disable parallel tool use.",
        ],
        answer: 1,
        explain:
          "Tool selection degrades with many overlapping, vaguely described tools. Clearer descriptions and fewer competing options fix most selection errors.",
      },
    ],
  },
];
