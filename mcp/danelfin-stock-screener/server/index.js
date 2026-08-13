import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import {
  getStockScore,
  getStockScoresBulk,
  listDanelfinTools,
  getNativeTopStocks,
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
  if (!force && fresh && top10Cache.data && top10Cache.data.length) {
    return res.json({ stocks: top10Cache.data, cached: true, source: top10Cache.source });
  }

  try {
    // Prefer Danelfin's own ranking tool (get_top_ranked / get_best_stocks) —
    // one call, server-side ranked, no rate-limit risk.
    let stocks = await getNativeTopStocks({ market: "us_stocks", limit: 10 });
    let source = "danelfin_ranked";

    if (!stocks) {
      // No native ranking tool available on this account — fall back to
      // scoring a fixed universe of large-cap US stocks ourselves.
      const scored = await getStockScoresBulk(US_STOCK_UNIVERSE, {
        concurrency: 3,
      });
      const failed = scored.filter((s) => s.error);
      if (failed.length) {
        console.warn(
          `[top10] ${failed.length}/${scored.length} tickers failed, e.g.:`,
          failed[0].error
        );
      }
      stocks = scored
        .filter((s) => !s.error && s.aiScore != null)
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 10);
      source = "universe_fallback";
    }

    if (!stocks.length) {
      // Don't cache an empty result — that would lock the section empty for
      // the full TTL after a transient failure. Surface the problem instead
      // so the next request/refresh actually retries.
      return res.status(502).json({
        error:
          "Danelfin didn't return any usable scores just now (possibly rate limiting or a transient error). Try refreshing in a moment.",
      });
    }

    top10Cache = { data: stocks, fetchedAt: Date.now(), source };
    res.json({ stocks, cached: false, source });
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
      { concurrency: 3 }
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
