const $ = (sel) => document.querySelector(sel);

// ---------------------------------------------------------------------------
// MCP connection status
// ---------------------------------------------------------------------------

async function checkMcpStatus() {
  const dot = $("#mcpDot");
  const text = $("#mcpStatusText");
  try {
    const res = await fetch("/api/mcp/tools");
    if (!res.ok) throw new Error((await res.json()).error || "error");
    dot.className = "dot ok";
    text.textContent = "Connected to Danelfin";
  } catch (err) {
    dot.className = "dot error";
    text.textContent = `Danelfin unreachable: ${err.message}`;
  }
}

// ---------------------------------------------------------------------------
// Score badge rendering
// ---------------------------------------------------------------------------

function scoreBadge(value) {
  if (value == null || Number.isNaN(value)) {
    return `<span class="score-badge score-na">—</span>`;
  }
  let cls = "score-critical", icon = "▼", label = "Weak";
  if (value >= 7) { cls = "score-good"; icon = "▲"; label = "Strong"; }
  else if (value >= 4) { cls = "score-warning"; icon = "●"; label = "Neutral"; }
  return `<span class="score-badge ${cls}"><span class="score-icon">${icon}</span>${value.toFixed(1)} · ${label}</span>`;
}

function numOrDash(v) {
  return v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(1);
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

async function loadPortfolio() {
  const tbody = $("#portfolioBody");
  tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Loading scores…</td></tr>`;

  const res = await fetch("/api/portfolio?withScores=1");
  const { holdings } = await res.json();

  if (!holdings.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No holdings yet — click "+ Add stock" to get started.</td></tr>`;
    return;
  }

  tbody.innerHTML = holdings
    .map((h) => {
      const s = h.score || {};
      return `
        <tr data-id="${h.id}">
          <td class="ticker-cell">${h.ticker}</td>
          <td>${s.error ? `<span class="score-badge score-na" title="${s.error}">error</span>` : scoreBadge(s.aiScore)}</td>
          <td class="num">${numOrDash(s.fundamental)}</td>
          <td class="num">${numOrDash(s.technical)}</td>
          <td class="num">${numOrDash(s.sentiment)}</td>
          <td class="num editable" data-field="shares">${h.shares ?? ""}</td>
          <td class="num editable" data-field="costBasis">${h.costBasis ?? ""}</td>
          <td class="editable" data-field="notes">${h.notes ?? ""}</td>
          <td><button class="btn-icon delete-btn" title="Delete">✕</button></td>
        </tr>`;
    })
    .join("");

  tbody.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const row = e.target.closest("tr");
      const id = row.dataset.id;
      if (!confirm(`Remove ${row.querySelector(".ticker-cell").textContent} from your portfolio?`)) return;
      await fetch(`/api/portfolio/${id}`, { method: "DELETE" });
      loadPortfolio();
    });
  });

  tbody.querySelectorAll(".editable").forEach((cell) => {
    cell.addEventListener("click", () => startEdit(cell));
  });
}

function startEdit(cell) {
  if (cell.querySelector("input")) return;
  const current = cell.textContent.trim();
  const field = cell.dataset.field;
  const type = field === "notes" ? "text" : "number";
  cell.innerHTML = `<input type="${type}" value="${current}" style="width:100%;font:inherit;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--surface-1);color:var(--text-primary);" />`;
  const input = cell.querySelector("input");
  input.focus();
  input.select();

  const commit = async () => {
    const row = cell.closest("tr");
    const id = row.dataset.id;
    const value = input.value;
    await fetch(`/api/portfolio/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    loadPortfolio();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") loadPortfolio();
  });
  input.addEventListener("blur", commit);
}

$("#addHoldingBtn").addEventListener("click", () => {
  $("#addHoldingForm").classList.toggle("hidden");
  $("#fTicker").focus();
});
$("#cancelAddBtn").addEventListener("click", () => {
  $("#addHoldingForm").classList.add("hidden");
  $("#addHoldingForm").reset();
});
$("#addHoldingForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const ticker = $("#fTicker").value.trim();
  if (!ticker) return;
  await fetch("/api/portfolio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ticker,
      shares: $("#fShares").value || null,
      costBasis: $("#fCost").value || null,
      notes: $("#fNotes").value || null,
    }),
  });
  $("#addHoldingForm").reset();
  $("#addHoldingForm").classList.add("hidden");
  loadPortfolio();
});

// ---------------------------------------------------------------------------
// Top 10 US Stocks
// ---------------------------------------------------------------------------

async function loadTop10(force = false) {
  const tbody = $("#top10Body");
  tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Scoring the US large-cap universe… this can take a few seconds.</td></tr>`;

  try {
    const res = await fetch(`/api/top10${force ? "?refresh=1" : ""}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    const stocks = data.stocks || [];
    if (!stocks.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No data returned.</td></tr>`;
      return;
    }

    tbody.innerHTML = stocks
      .map((s, i) => `
        <tr>
          <td class="rank-cell">${i + 1}</td>
          <td class="ticker-cell">${s.ticker}</td>
          <td>${scoreBadge(s.aiScore)}</td>
          <td class="num">${numOrDash(s.fundamental)}</td>
          <td class="num">${numOrDash(s.technical)}</td>
          <td class="num">${numOrDash(s.sentiment)}</td>
          <td><button class="btn-icon add-from-top10" data-ticker="${s.ticker}" title="Add to portfolio">+</button></td>
        </tr>`)
      .join("");

    tbody.querySelectorAll(".add-from-top10").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker: btn.dataset.ticker }),
        });
        loadPortfolio();
        btn.textContent = "✓";
      });
    });

    $("#top10Hint").textContent = data.cached
      ? "Ranked by Danelfin AI Score (cached, refresh for latest)."
      : "Ranked live by Danelfin AI Score.";
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-row">Couldn't load: ${err.message}</td></tr>`;
  }
}

$("#refreshTop10Btn").addEventListener("click", () => loadTop10(true));

// ---------------------------------------------------------------------------
// Chatbot
// ---------------------------------------------------------------------------

function addChatMessage(text, who) {
  const wrap = $("#chatMessages");
  const div = document.createElement("div");
  div.className = `chat-msg ${who}`;
  div.textContent = text;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}

addChatMessage(
  'Hi! Ask me things like "score AAPL", "add TSLA to portfolio", or "top 10". Type "help" any time.',
  "bot"
);

$("#chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#chatInput");
  const message = input.value.trim();
  if (!message) return;
  addChatMessage(message, "user");
  input.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    addChatMessage(data.reply || "…", "bot");
    if (data.action === "portfolio_changed" || data.action === "portfolio_view") {
      loadPortfolio();
    }
  } catch (err) {
    addChatMessage(`Something went wrong: ${err.message}`, "bot");
  }
});

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

checkMcpStatus();
loadPortfolio();
loadTop10();
