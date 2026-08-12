import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "portfolio.json");

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, "[]", "utf-8");
  }
}

async function load() {
  await ensureStore();
  const raw = await readFile(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function save(items) {
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function listHoldings() {
  return load();
}

export async function addHolding({ ticker, shares, costBasis, notes }) {
  const items = await load();
  const holding = {
    id: nanoid(8),
    ticker: ticker.toUpperCase(),
    shares: shares != null ? Number(shares) : null,
    costBasis: costBasis != null ? Number(costBasis) : null,
    notes: notes || "",
    addedAt: new Date().toISOString(),
  };
  items.push(holding);
  await save(items);
  return holding;
}

export async function updateHolding(id, patch) {
  const items = await load();
  const idx = items.findIndex((h) => h.id === id);
  if (idx === -1) return null;
  const updated = { ...items[idx] };
  if (patch.ticker != null) updated.ticker = String(patch.ticker).toUpperCase();
  if (patch.shares != null) updated.shares = Number(patch.shares);
  if (patch.costBasis != null) updated.costBasis = Number(patch.costBasis);
  if (patch.notes != null) updated.notes = String(patch.notes);
  updated.updatedAt = new Date().toISOString();
  items[idx] = updated;
  await save(items);
  return updated;
}

export async function deleteHolding(id) {
  const items = await load();
  const next = items.filter((h) => h.id !== id);
  const removed = next.length !== items.length;
  await save(next);
  return removed;
}
