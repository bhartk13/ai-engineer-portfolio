// Lazily-created Postgres connection pool, used only when DATABASE_URL is
// set (e.g. a free Supabase project on Render). When DATABASE_URL is absent
// (typical local dev), the app falls back to the flat-file store instead —
// see portfolio.js.

import pg from "pg";

const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Hosted providers (Supabase, Render Postgres, etc.) require SSL but
      // typically use a cert Node won't validate by default; local dev
      // databases usually run without SSL at all.
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

let schemaReady = null;

export async function ensureSchema() {
  const p = getPool();
  if (!p) return;
  if (!schemaReady) {
    schemaReady = p.query(`
      CREATE TABLE IF NOT EXISTS holdings (
        id TEXT PRIMARY KEY,
        ticker TEXT NOT NULL,
        shares NUMERIC,
        cost_basis NUMERIC,
        notes TEXT,
        added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ
      );
    `);
  }
  await schemaReady;
}
