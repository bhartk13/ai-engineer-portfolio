import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  getStockScore,
  getStockScoresBulk,
  listDanelfinTools,
  findTopStocksTool,
  callTool,
} from "./mcpClient.js";
import {
  addHolding,
  deleteHolding,
  listHoldings,
  updateHolding,
  storageMode,
} from "./portfolio.js";
import { handleChatMessage } from "./chatbot.js";
import { US_STOCK_UNIVERSE } from "./universe.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3787;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

app.get("/api/health", (req, res) => {
  res.json({ ok: true, storage: storageMode });
});

app.get("/api/mcp/tools", async (req, res) => {
  try {
    const tools = await listDanelfinTools({ force: req.query.refresh === "1" });
    res.json({ tools });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Stock score lookup
// ---------------------------------------------------------------------------

app.get("/api/score/:ticker", async (req, res) => {
  try {
    const score = await getStockScore(req.params.ticker);
    res.json(score);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Top 10 US Stocks
// ---------------------------------------------------------------------------

let top10Cache = { data: null, fetchedAt: 0 };
const TOP10_TTL_MS = 15 * 60 * 1000; // 15 minutes

app.get("/api/top10", async (req, res) => {
  const force = req.query.refresh === "1";
  const fresh = Date.now() - top10Cache.fetchedAt < TOP10_TTL_MS;
  if (!force && fresh && top10Cache.data) {
    return res.json({ stocks: top10Cache.data, cached: true });
  }

  try {
    // Prefer a native Danelfin screener/ranking tool if one exists.
    const topTool = await findTopStocksTool();
    let stocks;

    if (topTool) {
      const raw = await callTool(topTool.name, { market: "US", limit: 10 });
      const list = Array.isArray(raw) ? raw : raw?.stocks || raw?.data || [];
      stocks = list.slice(0, 10);
    } else {
      // Fall back to scoring a fixed universe of large-cap US stocks and
      // ranking by AI Score ourselves.
      const scored = await getStockScoresBulk(US_STOCK_UNIVERSE, {
        concurrency: 5,
      });
      stocks = scored
        .filter((s) => !s.error && s.aiScore != null)
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 10);
    }

    top10Cache = { data: stocks, fetchedAt: Date.now() };
    res.json({ stocks, cached: false });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Portfolio CRUD
// ---------------------------------------------------------------------------

app.get("/api/portfolio", async (req, res) => {
  const holdings = await listHoldings();

  if (req.query.withScores === "1") {
    const scores = await getStockScoresBulk(
      holdings.map((h) => h.ticker),
      { concurrency: 5 }
    );
    const byTicker = Object.fromEntries(scores.map((s) => [s.ticker, s]));
    const enriched = holdings.map((h) => ({ ...h, score: byTicker[h.ticker] }));
    return res.json({ holdings: enriched });
  }

  res.json({ holdings });
});

app.post("/api/portfolio", async (req, res) => {
  const { ticker, shares, costBasis, notes } = req.body || {};
  if (!ticker || !String(ticker).trim()) {
    return res.status(400).json({ error: "ticker is required" });
  }
  const holding = await addHolding({ ticker, shares, costBasis, notes });
  res.status(201).json({ holding });
});

app.put("/api/portfolio/:id", async (req, res) => {
  const updated = await updateHolding(req.params.id, req.body || {});
  if (!updated) return res.status(404).json({ error: "not found" });
  res.json({ holding: updated });
});

app.delete("/api/portfolio/:id", async (req, res) => {
  const removed = await deleteHolding(req.params.id);
  if (!removed) return res.status(404).json({ error: "not found" });
  res.status(204).end();
});

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

app.post("/api/chat", async (req, res) => {
  const { message } = req.body || {};
  try {
    const reply = await handleChatMessage(message);
    res.json(reply);
  } catch (err) {
    res.status(500).json({ reply: `Something went wrong: ${err.message}` });
  }
});

app.listen(PORT, () => {
  console.log(`Danelfin Stock Screener running at http://localhost:${PORT}`);
  console.log("Connecting to Danelfin MCP server...");
  listDanelfinTools()
    .then(() => console.log("Danelfin MCP connection ready."))
    .catch((err) =>
      console.error(
        "Warning: could not connect to Danelfin MCP server yet:",
        err.message
      )
    );
});
