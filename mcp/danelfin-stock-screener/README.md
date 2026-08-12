# Danelfin Stock Screener

A simple, self-hosted stock screener with:

- **Portfolio** — add / edit / delete holdings, each showing its live Danelfin **AI Score** (plus Fundamental, Technical, and Sentiment sub-scores).
- **Top 10 US Stocks** — a curated large-cap US universe, ranked live by Danelfin AI Score (or by Danelfin's own screener/ranking tool, if your account exposes one).
- **Chatbot** — a lightweight, no-API-key-needed assistant that understands commands like `score AAPL`, `add TSLA to portfolio`, `remove AAPL`, `show portfolio`, `top 10`.

It talks to Danelfin through their **MCP server** (`https://mcp.danelfin.com/mcp`), the same one you'd wire up with:

```
claude mcp add --transport http danelfin https://mcp.danelfin.com/mcp \
  --header "Authorization: Bearer YOUR_API_KEY"
```

This app is a standalone Node/Express server that plays the role of the MCP *client* itself (using `@modelcontextprotocol/sdk`), so it works independently of Claude Code/Desktop — you just run it and open it in a browser.

## 1. Requirements

- Node.js 18+ (Node 20/22 recommended)
- A Danelfin API key with MCP access

## 2. Setup

```bash
cd danelfin-stock-screener
npm install
```


If you ever need to rotate the key, just edit `.env` (never commit this file — it's already git-ignored). `.env.example` is a blank template if you want to hand this project to someone else.

There's a fourth, optional variable, `DATABASE_URL`. Leave it unset for local dev — the portfolio is stored in `data/portfolio.json` and that's fine on your own machine. It matters once you deploy to a free host that wipes its disk on restart; see **§8 Deploying to the cloud for free** below.

## 3. Run it

```bash
npm start
```

Then open **http://localhost:3787** in your browser.

On startup the server connects to the Danelfin MCP server and logs the tools it discovered:

```
Danelfin Stock Screener running at http://localhost:3787
Connecting to Danelfin MCP server...
Danelfin MCP connection ready.
```

If instead you see a connection warning, double-check your API key and that your network can reach `mcp.danelfin.com` (corporate firewalls/VPNs sometimes block new hosts).

> **Note on where this was built:** this project was assembled in a sandboxed cloud environment whose outbound network is allow-listed, so `mcp.danelfin.com` couldn't be reached from there to run a live end-to-end test. Everything that doesn't depend on reaching Danelfin (server startup, the portfolio API, the UI, graceful error handling when the MCP call fails) was tested directly. The actual live connection, `get_stock_score` calls, and the Top 10 ranking should be verified the first time you run `npm start` on your own machine.

## 4. How the sections work

### Portfolio

- Click **+ Add stock**, enter a ticker (shares/cost basis/notes are optional), and save.
- Click directly on the Shares, Cost/share, or Notes cell to edit it inline.
- Click the **✕** to remove a holding.
- The AI Score column calls Danelfin's `get_stock_score` tool for every holding each time the page loads.

### Top 10 US Stocks

Danelfin's docs point to `get_stock_score` as the primary tool. The app first checks whether your account's MCP server *also* exposes a dedicated screener/ranking tool (anything named like `top_stocks`, `screener`, `ranking`, etc.) and uses it if found. Otherwise, it falls back to scoring a fixed list of ~40 large-cap US tickers (see `server/universe.js` — feel free to edit this list) and ranking them by AI Score. Results are cached for 15 minutes; click **↻ Refresh** to force a re-fetch.

### Chatbot

No LLM or extra API key required — it's a small command parser (`server/chatbot.js`) that maps phrases to the same backend functions the UI uses. Type `help` in the chat box to see everything it understands. If you'd rather have free-form natural-language chat (e.g. "which of my holdings look weakest right now?"), that would need an LLM provider (like the Anthropic API) wired in — happy to add that later if you want it.

## 5. Project structure

```
danelfin-stock-screener/
├── server/
│   ├── index.js          Express app + all REST routes
│   ├── mcpClient.js       Danelfin MCP connection, tool discovery, get_stock_score wrapper
│   ├── portfolio.js       Picks the storage backend below based on DATABASE_URL
│   ├── portfolioFile.js   Local JSON-file storage (used when DATABASE_URL is unset)
│   ├── portfolioSql.js    Postgres storage (used when DATABASE_URL is set)
│   ├── db.js              Postgres connection pool + schema creation
│   ├── chatbot.js         Command-based chatbot
│   └── universe.js        Fallback list of large-cap US tickers for Top 10
├── public/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── data/portfolio.json   Local holdings storage when DATABASE_URL is unset
├── probe.mjs             Standalone script to list whatever tools your Danelfin MCP server exposes
├── render.yaml           Render Blueprint — see §8
├── .env                  Your API key (git-ignored)
└── package.json
```

## 6. Useful debug endpoints

- `GET /api/mcp/tools` — lists every tool Danelfin's MCP server currently exposes for your account (handy if they add a native "top stocks" tool later — the app will auto-detect it).
- `GET /api/health` — basic liveness check; also reports which storage backend is active (`"storage": "file"` or `"storage": "postgres"`).
- `node probe.mjs` (with `DANELFIN_API_KEY` set) — a minimal standalone script that connects and dumps the raw tool list to your terminal.

## 7. Notes & next steps

- Local storage is a flat JSON file (`data/portfolio.json`) — fine for personal/local use, not multi-user safe. In production, point `DATABASE_URL` at Postgres instead (§8) — same portfolio.js interface either way.
- The score→color thresholds in the UI (`app.js`, `scoreBadge()`) assume a 0–10 scale (≥7 good, 4–6.9 neutral, <4 weak). Adjust if Danelfin's actual scale for your account differs.
- `mcpClient.js` doesn't hardcode Danelfin's exact input schema for `get_stock_score` — it inspects the tool's declared schema at runtime and matches a ticker-like field name. If Danelfin ever changes the parameter name, this should keep working without code changes.

## 8. Deploying to the cloud for free (Render + Supabase)

This deploys the app to **Render's free web-service tier**, with holdings stored in a **free Supabase Postgres** database so they survive restarts and redeploys (Render's free tier wipes its local disk on every restart/deploy — without a database your portfolio would disappear each time the instance sleeps).

**Trade-off to know going in:** Render's free web services spin down after ~15 minutes of no traffic. The first request after that takes roughly 30–60 seconds to wake back up (and will also re-establish the Danelfin MCP connection). Totally fine for a personal tool; not something to point real users at.

### 8.1 Push the project to GitHub

Render deploys from a git repo, not a zip upload.

```bash
cd danelfin-stock-screener
git init
git add .
git commit -m "Initial commit"
```

Create a new empty repo on GitHub (github.com → New repository), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

`.env` is already git-ignored, so your API key won't be pushed. Good — you'll set it as a Render secret instead (§8.3).

### 8.2 Create a free Supabase Postgres database

1. Go to [supabase.com](https://supabase.com) → sign up (free) → **New project**.
2. Pick a name/region and set a database password — save it somewhere, you'll need it in the connection string.
3. Once the project is ready, go to **Project Settings → Database → Connection string** and copy the **URI** under "Connection pooling" (the "Transaction" pooler, port `6543`, is the safest default for an app like this — it handles Render's connection pattern well). It looks like:
   ```
   postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-region.pooler.supabase.com:6543/postgres
   ```
4. Swap in your actual database password where it says `[YOUR-PASSWORD]`. That full string is your `DATABASE_URL`.

You don't need to run any SQL yourself — the app creates its `holdings` table automatically on first use (see `server/db.js`).

### 8.3 Deploy to Render

**Option A — Blueprint (uses the included `render.yaml`):**

1. In the Render dashboard: **New +** → **Blueprint**.
2. Connect your GitHub account and pick the repo you just pushed.
3. Render reads `render.yaml` and shows the `danelfin-stock-screener` web service it's about to create. When prompted, fill in:
   - `DANELFIN_API_KEY` — your Danelfin key
   - `DATABASE_URL` — the Supabase connection string from §8.2
4. Click **Apply** / **Create**. Render installs dependencies (`npm install`) and starts the app (`npm start`) automatically.

**Option B — Manual web service (if you'd rather not use the blueprint):**

1. **New +** → **Web Service** → connect the repo.
2. Runtime: **Node**. Build command: `npm install`. Start command: `npm start`.
3. Plan: **Free**.
4. Under **Environment**, add:
   - `DANELFIN_API_KEY`
   - `DANELFIN_MCP_URL` = `https://mcp.danelfin.com/mcp` (optional — this is already the default)
   - `DATABASE_URL`
5. Create the service.

Don't set `PORT` yourself — Render injects its own and the app already listens on `process.env.PORT`.

### 8.4 Verify

Once deployed, Render gives you a URL like `https://danelfin-stock-screener.onrender.com`. Open it, and check:

- `https://your-app.onrender.com/api/health` → should show `{"ok":true,"storage":"postgres"}`. If it says `"storage":"file"`, `DATABASE_URL` isn't set correctly in Render's environment settings.
- The green "Connected to Danelfin" status pill top-right.
- Add a test holding, then use Render's dashboard to manually restart the service (or just wait for it to spin down and wake back up) — the holding should still be there afterward, confirming Postgres persistence is working.

### 8.5 Free-tier gotchas

- **Cold starts:** first request after 15 min idle is slow (~30-60s) — this is Render waking the container, not a bug.
- **Supabase free project pausing:** Supabase free projects also pause after a week of no activity; opening the Supabase dashboard or hitting your app (which queries the DB) resumes it, but the very first request after a long pause may be slow or briefly error — refresh once.
- **Rotating secrets:** change `DANELFIN_API_KEY` or `DATABASE_URL` any time from the Render dashboard's **Environment** tab — no redeploy of code required, Render restarts the service with the new values.
