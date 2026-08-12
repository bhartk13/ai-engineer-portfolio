// Thin wrapper around the Danelfin MCP server.
//
// We connect once at startup using the Streamable HTTP transport (the same
// transport used by `claude mcp add --transport http danelfin ...`), then
// discover whatever tools the server actually exposes. We don't hardcode
// Danelfin's exact input schema for get_stock_score — instead we inspect the
// tool's declared inputSchema at runtime and match a "ticker-like" field, so
// the app keeps working even if Danelfin renames/adds parameters.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const TICKER_FIELD_CANDIDATES = [
  "ticker",
  "symbol",
  "stock",
  "stock_ticker",
  "stockTicker",
  "ric",
  "code",
];

let client = null;
let toolsCache = null;
let connecting = null;

function log(...args) {
  console.log("[danelfin-mcp]", ...args);
}

export async function getClient() {
  if (client) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    const apiKey = process.env.DANELFIN_API_KEY;
    const url = process.env.DANELFIN_MCP_URL || "https://mcp.danelfin.com/mcp";

    if (!apiKey || apiKey === "your_danelfin_api_key_here") {
      throw new Error(
        "DANELFIN_API_KEY is not set. Add it to your .env file before starting the server."
      );
    }

    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    });

    const c = new Client({ name: "danelfin-stock-screener", version: "1.0.0" });
    await c.connect(transport);
    log(`Connected to Danelfin MCP server at ${url}`);

    client = c;
    return c;
  })();

  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

export async function listDanelfinTools({ force = false } = {}) {
  if (toolsCache && !force) return toolsCache;
  const c = await getClient();
  const result = await c.listTools();
  toolsCache = result.tools || [];
  log(
    "Discovered tools:",
    toolsCache.map((t) => t.name).join(", ") || "(none)"
  );
  return toolsCache;
}

async function findTool(nameOrPredicate) {
  const tools = await listDanelfinTools();
  if (typeof nameOrPredicate === "function") {
    return tools.find(nameOrPredicate) || null;
  }
  const target = nameOrPredicate.toLowerCase();
  return (
    tools.find((t) => t.name.toLowerCase() === target) ||
    tools.find((t) => t.name.toLowerCase().includes(target)) ||
    null
  );
}

/** Picks the most plausible "ticker" field name from a tool's input schema. */
function guessTickerField(tool) {
  const props = tool?.inputSchema?.properties || {};
  const keys = Object.keys(props);
  for (const candidate of TICKER_FIELD_CANDIDATES) {
    if (keys.includes(candidate)) return candidate;
  }
  // fall back to the first required string field, if any
  const required = tool?.inputSchema?.required || [];
  if (required.length) return required[0];
  return keys[0] || "ticker";
}

function extractStructured(callResult) {
  // MCP tool results carry a `content` array of blocks (text/json/etc).
  // Danelfin's tools return JSON-ish text; try to parse it, otherwise
  // hand back the raw text so the UI can still show something useful.
  if (callResult.structuredContent) return callResult.structuredContent;

  const blocks = callResult.content || [];
  const textBlock = blocks.find((b) => b.type === "text");
  if (textBlock) {
    try {
      return JSON.parse(textBlock.text);
    } catch {
      return { raw: textBlock.text };
    }
  }
  return { raw: blocks };
}

let scoreToolPromise = null;
async function getScoreTool() {
  if (!scoreToolPromise) {
    scoreToolPromise = findTool("get_stock_score").then((tool) => {
      if (!tool) {
        throw new Error(
          "Could not find a 'get_stock_score' tool on the Danelfin MCP server. " +
            "Check `GET /api/mcp/tools` to see what's actually available."
        );
      }
      return tool;
    });
  }
  return scoreToolPromise;
}

/** Calls Danelfin's get_stock_score tool for a single ticker. */
export async function getStockScore(ticker) {
  const c = await getClient();
  const tool = await getScoreTool();
  const field = guessTickerField(tool);

  const result = await c.callTool({
    name: tool.name,
    arguments: { [field]: ticker.toUpperCase() },
  });

  if (result.isError) {
    const msg =
      result.content?.find((b) => b.type === "text")?.text ||
      "Danelfin returned an error for this ticker.";
    throw new Error(msg);
  }

  const data = extractStructured(result);
  return normalizeScore(ticker, data);
}

/** Best-effort normalization of whatever shape Danelfin sends back. */
function normalizeScore(ticker, data) {
  const flat = Array.isArray(data) ? data[0] || {} : data || {};
  const findNumeric = (patterns) => {
    for (const [key, value] of Object.entries(flat)) {
      if (
        patterns.some((p) => key.toLowerCase().includes(p)) &&
        (typeof value === "number" || !Number.isNaN(Number(value)))
      ) {
        return Number(value);
      }
    }
    return null;
  };

  const aiScore =
    findNumeric(["ai_score", "aiscore"]) ?? findNumeric(["score"]) ?? null;
  const fundamental = findNumeric(["fundamental"]);
  const technical = findNumeric(["technical"]);
  const sentiment = findNumeric(["sentiment"]);
  const lowRisk = findNumeric(["low_risk", "risk"]);

  return {
    ticker: ticker.toUpperCase(),
    aiScore,
    fundamental,
    technical,
    sentiment,
    lowRisk,
    raw: flat,
    fetchedAt: new Date().toISOString(),
  };
}

/** Runs getStockScore over a list of tickers with limited concurrency. */
export async function getStockScoresBulk(tickers, { concurrency = 4 } = {}) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < tickers.length) {
      const idx = i++;
      const ticker = tickers[idx];
      try {
        results[idx] = await getStockScore(ticker);
      } catch (err) {
        results[idx] = {
          ticker: ticker.toUpperCase(),
          error: err.message || String(err),
        };
      }
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, tickers.length) },
    worker
  );
  await Promise.all(workers);
  return results;
}

/**
 * If Danelfin exposes a dedicated "top stocks" / screener / ranking tool,
 * use it directly. Returns null if nothing matching is found, so callers
 * can fall back to scoring a fixed universe themselves.
 */
export async function findTopStocksTool() {
  return findTool(
    (t) => /top.*stock|screener|ranking|rank.*stock|best.*stock/i.test(t.name)
  );
}

export async function callTool(name, args) {
  const c = await getClient();
  const result = await c.callTool({ name, arguments: args });
  return extractStructured(result);
}
