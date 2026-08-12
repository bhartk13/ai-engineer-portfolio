// Postgres-backed portfolio store — same interface as portfolioFile.js, used
// when DATABASE_URL is set (see portfolio.js and server/db.js). This is what
// keeps holdings alive across restarts/redeploys on an ephemeral host like
// Render's free tier, by pointing at a free-forever hosted Postgres (e.g.
// Supabase) instead of the local filesystem.

import { nanoid } from "nanoid";
import { getPool, ensureSchema } from "./db.js";

function rowToHolding(row) {
  return {
    id: row.id,
    ticker: row.ticker,
    shares: row.shares != null ? Number(row.shares) : null,
    costBasis: row.cost_basis != null ? Number(row.cost_basis) : null,
    notes: row.notes || "",
    addedAt: row.added_at ? new Date(row.added_at).toISOString() : null,
    ...(row.updated_at ? { updatedAt: new Date(row.updated_at).toISOString() } : {}),
  };
}

export async function listHoldings() {
  await ensureSchema();
  const { rows } = await getPool().query(
    "SELECT * FROM holdings ORDER BY added_at ASC"
  );
  return rows.map(rowToHolding);
}

export async function addHolding({ ticker, shares, costBasis, notes }) {
  await ensureSchema();
  const id = nanoid(8);
  const { rows } = await getPool().query(
    `INSERT INTO holdings (id, ticker, shares, cost_basis, notes, added_at)
     VALUES ($1, $2, $3, $4, $5, now())
     RETURNING *`,
    [
      id,
      ticker.toUpperCase(),
      shares != null ? Number(shares) : null,
      costBasis != null ? Number(costBasis) : null,
      notes || "",
    ]
  );
  return rowToHolding(rows[0]);
}

export async function updateHolding(id, patch) {
  await ensureSchema();
  const { rows: existingRows } = await getPool().query(
    "SELECT * FROM holdings WHERE id = $1",
    [id]
  );
  if (!existingRows.length) return null;
  const current = rowToHolding(existingRows[0]);

  const ticker = patch.ticker != null ? String(patch.ticker).toUpperCase() : current.ticker;
  const shares = patch.shares != null ? Number(patch.shares) : current.shares;
  const costBasis = patch.costBasis != null ? Number(patch.costBasis) : current.costBasis;
  const notes = patch.notes != null ? String(patch.notes) : current.notes;

  const { rows } = await getPool().query(
    `UPDATE holdings
     SET ticker = $1, shares = $2, cost_basis = $3, notes = $4, updated_at = now()
     WHERE id = $5
     RETURNING *`,
    [ticker, shares, costBasis, notes, id]
  );
  return rowToHolding(rows[0]);
}

export async function deleteHolding(id) {
  await ensureSchema();
  const { rowCount } = await getPool().query("DELETE FROM holdings WHERE id = $1", [id]);
  return rowCount > 0;
}
