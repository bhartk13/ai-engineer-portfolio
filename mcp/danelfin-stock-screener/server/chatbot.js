// A small, dependency-free command-style chatbot. No LLM/API key required.
// It understands a handful of natural-ish phrasings and delegates to the
// same functions the REST API uses, so answers always reflect live
// Danelfin data (or the local portfolio store).

import { getStockScore } from "./mcpClient.js";
import { addHolding, deleteHolding, listHoldings } from "./portfolio.js";

const TICKER_RE = /\b([A-Z]{1,5}(?:\.[A-Z])?)\b/;

function extractTicker(text) {
  // Prefer an explicit all-caps token (e.g. "score for AAPL"); fall back to
  // the last word if the user typed lowercase.
  const upper = text.match(/\b[A-Z]{1,5}(?:\.[A-Z])?\b/g);
  if (upper && upper.length) {
    // ignore common words that happen to be all-caps commands
    const stop = new Set(["AI", "US", "ADD", "TOP"]);
    const candidate = upper.find((t) => !stop.has(t));
    if (candidate) return candidate;
  }
  const words = text.trim().split(/\s+/);
  const last = words[words.length - 1] || "";
  const cleaned = last.replace(/[^a-zA-Z.]/g, "");
  return cleaned ? cleaned.toUpperCase() : null;
}

function formatScoreReply(score) {
  if (score.error) {
    return `I couldn't get a score for ${score.ticker}: ${score.error}`;
  }
  const parts = [`${score.ticker} — AI Score: ${score.aiScore ?? "n/a"}/10`];
  if (score.fundamental != null) parts.push(`Fundamental: ${score.fundamental}`);
  if (score.technical != null) parts.push(`Technical: ${score.technical}`);
  if (score.sentiment != null) parts.push(`Sentiment: ${score.sentiment}`);
  if (score.lowRisk != null) parts.push(`Low Risk: ${score.lowRisk}`);
  return parts.join(" · ");
}

const HELP_TEXT = [
  "Here's what I can do:",
  '• "score AAPL" or "how is TSLA doing" — get the Danelfin AI Score for a ticker',
  '• "add MSFT to portfolio" — add a holding (you can edit shares/cost later in the Portfolio section)',
  '• "remove AAPL from portfolio" — delete a holding by ticker',
  '• "show portfolio" — list your current holdings',
  '• "top 10" — show the Top 10 US Stocks section highlights',
  '• "help" — show this message',
].join("\n");

export async function handleChatMessage(text) {
  const msg = (text || "").trim();
  const lower = msg.toLowerCase();

  if (!msg) {
    return { reply: HELP_TEXT };
  }

  if (/^help\b|what can you do/.test(lower)) {
    return { reply: HELP_TEXT };
  }

  if (/^(show|list|view)\s+(my\s+)?portfolio/.test(lower)) {
    const holdings = await listHoldings();
    if (!holdings.length) {
      return { reply: "Your portfolio is empty. Try \"add AAPL to portfolio\"." };
    }
    const lines = holdings.map(
      (h) => `${h.ticker}${h.shares ? ` — ${h.shares} shares` : ""}`
    );
    return { reply: `Your portfolio:\n${lines.join("\n")}`, action: "portfolio_view" };
  }

  if (/^(add|buy)\b.*(portfolio|watchlist)?/.test(lower) && /add|buy/.test(lower)) {
    const ticker = extractTicker(msg);
    if (!ticker) return { reply: "Which ticker should I add? e.g. \"add AAPL\"." };
    const holding = await addHolding({ ticker });
    return {
      reply: `Added ${holding.ticker} to your portfolio.`,
      action: "portfolio_changed",
    };
  }

  if (/^(remove|delete|sell)\b/.test(lower)) {
    const ticker = extractTicker(msg);
    if (!ticker) return { reply: "Which ticker should I remove?" };
    const holdings = await listHoldings();
    const match = holdings.find((h) => h.ticker === ticker);
    if (!match) {
      return { reply: `I don't see ${ticker} in your portfolio.` };
    }
    await deleteHolding(match.id);
    return {
      reply: `Removed ${ticker} from your portfolio.`,
      action: "portfolio_changed",
    };
  }

  if (/top\s*10|top ten|best stocks/.test(lower)) {
    return {
      reply:
        "Check the \"Top 10 US Stocks\" section above — it's ranked live by Danelfin AI Score. Say \"refresh top 10\" there any time to re-rank.",
      action: "show_top10",
    };
  }

  if (/score|rate|rating|how is|how's|outlook on/.test(lower)) {
    const ticker = extractTicker(msg);
    if (!ticker) {
      return { reply: "Which ticker would you like the AI Score for?" };
    }
    try {
      const score = await getStockScore(ticker);
      return { reply: formatScoreReply(score), score };
    } catch (err) {
      return { reply: `Sorry, I couldn't reach Danelfin: ${err.message}` };
    }
  }

  // Default: if the message looks like it's just a ticker, treat it as a
  // score lookup; otherwise show help.
  const bareTicker = msg.match(/^[A-Za-z.]{1,6}$/);
  if (bareTicker) {
    try {
      const score = await getStockScore(msg);
      return { reply: formatScoreReply(score), score };
    } catch (err) {
      return { reply: `Sorry, I couldn't reach Danelfin: ${err.message}` };
    }
  }

  return {
    reply:
      "I didn't quite catch that. Try \"score AAPL\", \"add TSLA to portfolio\", or \"help\".",
  };
}
