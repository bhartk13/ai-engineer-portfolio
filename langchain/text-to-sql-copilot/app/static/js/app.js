/**
 * Text-to-SQL Copilot — production UI
 */

const API = "/api/v1";

const EXAMPLES = [
  { label: "Total revenue", question: "What is the total revenue?" },
  { label: "Revenue by country", question: "What was total revenue by country?" },
  { label: "Customer count", question: "How many customers do we have?" },
  { label: "Top products", question: "Top 3 products by quantity sold" },
  { label: "USA customers", question: "How many customers are from the USA?" },
  { label: "Avg order value", question: "What is the average order value?" },
];

const SCHEMA = [
  {
    table: "customers",
    desc: "Customer accounts",
    cols: "id, name, email, country, created_at",
  },
  {
    table: "products",
    desc: "Product catalog",
    cols: "id, name, category, price",
  },
  {
    table: "orders",
    desc: "Customer orders",
    cols: "id, customer_id, order_date, status",
  },
  {
    table: "order_items",
    desc: "Line items per order",
    cols: "id, order_id, product_id, quantity, unit_price",
  },
];

const HISTORY_KEY = "sql-copilot-history";
const MAX_HISTORY = 20;

// ── DOM refs ───────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);

const els = {
  form: $("#query-form"),
  question: $("#question"),
  submitBtn: $("#submit-btn"),
  spinner: $("#spinner"),
  btnLabel: document.querySelector(".btn-label"),
  charCount: $("#char-count"),
  emptyState: $("#empty-state"),
  resultStack: $("#result-stack"),
  displayQuestion: $("#display-question"),
  displayAnswer: $("#display-answer"),
  badges: $("#badges"),
  sqlCard: $("#sql-card"),
  displaySql: $("#display-sql"),
  copySql: $("#copy-sql"),
  tableCard: $("#table-card"),
  tableHead: $("#table-head"),
  tableBody: $("#table-body"),
  rowCount: $("#row-count"),
  historyList: $("#history-list"),
  clearHistory: $("#clear-history"),
  exampleChips: $("#example-chips"),
  schemaList: $("#schema-list"),
  healthDot: $("#health-dot"),
  healthLabel: $("#health-label"),
  healthMeta: $("#health-meta"),
  cacheBypass: $("#cache-bypass"),
  clearCacheBtn: $("#clear-cache-btn"),
  cacheStats: $("#cache-stats"),
  toast: $("#toast"),
  sidebar: $("#sidebar"),
  sidebarOpen: $("#sidebar-open"),
  sidebarClose: $("#sidebar-close"),
};

let history = loadHistory();
let activeHistoryId = null;

// ── Init ───────────────────────────────────────────────────
function init() {
  renderExamples();
  renderSchema();
  renderHistory();
  fetchHealth();
  fetchCacheStats();
  bindEvents();
  autoResizeTextarea();
}

function bindEvents() {
  els.form.addEventListener("submit", onSubmit);
  els.question.addEventListener("input", () => {
    els.charCount.textContent = `${els.question.value.length}/500`;
    autoResizeTextarea();
  });
  els.question.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      els.form.requestSubmit();
    }
  });
  els.copySql.addEventListener("click", copySqlToClipboard);
  els.clearHistory.addEventListener("click", clearHistory);
  els.clearCacheBtn.addEventListener("click", clearCache);
  els.sidebarOpen?.addEventListener("click", () => els.sidebar.classList.add("open"));
  els.sidebarClose?.addEventListener("click", () => els.sidebar.classList.remove("open"));
}

function renderExamples() {
  els.exampleChips.innerHTML = EXAMPLES.map(
    (ex) =>
      `<button type="button" class="chip" data-q="${escapeAttr(ex.question)}">${escapeHtml(ex.label)}</button>`
  ).join("");

  els.exampleChips.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.question.value = btn.dataset.q;
      els.charCount.textContent = `${els.question.value.length}/500`;
      autoResizeTextarea();
      els.question.focus();
      els.sidebar.classList.remove("open");
    });
  });
}

function renderSchema() {
  els.schemaList.innerHTML = SCHEMA.map(
    (s) => `
      <div class="schema-item">
        <strong>${escapeHtml(s.table)}</strong>
        <span>${escapeHtml(s.desc)}</span>
        <code>${escapeHtml(s.cols)}</code>
      </div>`
  ).join("");
}

// ── API ────────────────────────────────────────────────────
async function fetchHealth() {
  try {
    const res = await fetch(`${API}/health`);
    const data = await res.json();
    const ok = data.status === "ok" && data.database === "ok";
    els.healthDot.className = `status-dot ${ok ? "ok" : "degraded"}`;
    els.healthLabel.textContent = ok ? "All systems operational" : "Degraded";
    els.healthMeta.textContent = `DB: ${data.database} · LLM: ${data.llm_provider}`;
  } catch {
    els.healthDot.className = "status-dot error";
    els.healthLabel.textContent = "API unreachable";
    els.healthMeta.textContent = "Check that the server is running";
  }
}

async function fetchCacheStats() {
  try {
    const res = await fetch(`${API}/cache/stats`);
    const data = await res.json();
    els.cacheStats.textContent = data.enabled
      ? `Cache: ${data.size}/${data.max_size} entries · TTL ${data.ttl_seconds}s`
      : "Cache disabled";
  } catch {
    els.cacheStats.textContent = "";
  }
}

async function clearCache() {
  try {
    const res = await fetch(`${API}/cache`, { method: "DELETE" });
    const data = await res.json();
    showToast(`Cleared ${data.cleared} cached entries`, "success");
    fetchCacheStats();
  } catch {
    showToast("Failed to clear cache");
  }
}

async function runQuery(question) {
  const headers = { "Content-Type": "application/json" };
  if (els.cacheBypass.checked) headers["X-Cache-Bypass"] = "true";

  const res = await fetch(`${API}/query`, {
    method: "POST",
    headers,
    body: JSON.stringify({ question }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

// ── Submit ─────────────────────────────────────────────────
async function onSubmit(e) {
  e.preventDefault();
  const question = els.question.value.trim();
  if (!question) return;

  setLoading(true);
  showResultsShell(question);
  els.displayAnswer.innerHTML = '<div class="skeleton" style="height:3rem"></div>';

  try {
    const data = await runQuery(question);
    renderResult(data);
    addToHistory(data);
    fetchCacheStats();
  } catch (err) {
    renderError(err.message);
  } finally {
    setLoading(false);
  }
}

function setLoading(on) {
  els.submitBtn.disabled = on;
  els.spinner.classList.toggle("hidden", !on);
  els.btnLabel.textContent = on ? "Running…" : "Run query";
}

function showResultsShell(question) {
  els.emptyState.classList.add("hidden");
  els.resultStack.classList.remove("hidden");
  els.displayQuestion.textContent = question;
  els.sqlCard.classList.add("hidden");
  els.tableCard.classList.add("hidden");
  els.badges.innerHTML = "";
}

function renderResult(data) {
  const isError = data.answer.startsWith("Could not produce");
  els.displayAnswer.textContent = data.answer;
  els.displayAnswer.classList.toggle("error", isError);

  els.badges.innerHTML = [
    data.cached ? `<span class="badge cached">Cached</span>` : "",
    `<span class="badge accent">${data.llm_calls} LLM call${data.llm_calls !== 1 ? "s" : ""}</span>`,
    data.retry_count > 0 ? `<span class="badge">${data.retry_count} retries</span>` : "",
    data.relevant_tables?.length
      ? `<span class="badge">${data.relevant_tables.join(", ")}</span>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  if (data.sql) {
    els.displaySql.textContent = formatSql(data.sql);
    els.sqlCard.classList.remove("hidden");
  }

  if (data.rows?.length > 0) {
    renderTable(data.columns, data.rows);
    els.rowCount.textContent = `${data.rows.length} row${data.rows.length !== 1 ? "s" : ""}`;
    els.tableCard.classList.remove("hidden");
  }
}

function renderError(message) {
  els.displayAnswer.textContent = message;
  els.displayAnswer.classList.add("error");
}

function renderTable(columns, rows) {
  els.tableHead.innerHTML = `<tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`;
  els.tableBody.innerHTML = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${escapeHtml(String(row[c] ?? ""))}</td>`).join("")}</tr>`
    )
    .join("");
}

// ── History ────────────────────────────────────────────────
function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(data) {
  const entry = {
    id: Date.now().toString(),
    question: data.question,
    answer: data.answer,
    sql: data.sql,
    columns: data.columns,
    rows: data.rows,
    relevant_tables: data.relevant_tables,
    llm_calls: data.llm_calls,
    retry_count: data.retry_count,
    cached: data.cached,
    ts: new Date().toISOString(),
  };

  history.unshift(entry);
  history = history.slice(0, MAX_HISTORY);
  activeHistoryId = entry.id;
  saveHistory();
  renderHistory();
}

function renderHistory() {
  if (history.length === 0) {
    els.historyList.innerHTML = '<li class="history-empty">No queries yet</li>';
    return;
  }

  els.historyList.innerHTML = history
    .map(
      (h) => `
      <li class="history-item ${h.id === activeHistoryId ? "active" : ""}" data-id="${h.id}">
        ${escapeHtml(truncate(h.question, 60))}
      </li>`
    )
    .join("");

  els.historyList.querySelectorAll(".history-item").forEach((li) => {
    li.addEventListener("click", () => {
      const entry = history.find((h) => h.id === li.dataset.id);
      if (entry) {
        activeHistoryId = entry.id;
        renderHistory();
        els.emptyState.classList.add("hidden");
        els.resultStack.classList.remove("hidden");
        els.displayQuestion.textContent = entry.question;
        renderResult(entry);
      }
    });
  });
}

function clearHistory() {
  history = [];
  activeHistoryId = null;
  saveHistory();
  renderHistory();
  els.resultStack.classList.add("hidden");
  els.emptyState.classList.remove("hidden");
  showToast("History cleared", "success");
}

// ── Utilities ──────────────────────────────────────────────
function formatSql(sql) {
  return sql
    .replace(/\s+/g, " ")
    .replace(/\b(SELECT|FROM|JOIN|LEFT JOIN|RIGHT JOIN|INNER JOIN|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|AS|ON|AND|OR)\b/gi, "\n$1")
    .trim();
}

function copySqlToClipboard() {
  const sql = els.displaySql.textContent;
  navigator.clipboard.writeText(sql).then(
    () => showToast("SQL copied", "success"),
    () => showToast("Copy failed")
  );
}

function autoResizeTextarea() {
  const ta = els.question;
  ta.style.height = "auto";
  ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, "&quot;");
}

let toastTimer;
function showToast(msg, type = "") {
  els.toast.textContent = msg;
  els.toast.className = `toast ${type}`.trim();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2800);
}

init();
