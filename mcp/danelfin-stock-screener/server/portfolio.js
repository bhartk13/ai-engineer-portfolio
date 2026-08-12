// Picks the portfolio storage backend at startup:
//  - DATABASE_URL set   -> Postgres (portfolioSql.js) — survives restarts,
//                          use this in production (e.g. a free Supabase
//                          project on Render).
//  - DATABASE_URL unset -> local JSON file (portfolioFile.js) — zero setup,
//                          fine for local dev, but resets on ephemeral hosts.
//
// Both modules export the same four functions, so the rest of the app never
// needs to know which one is active.

import * as fileStore from "./portfolioFile.js";
import * as sqlStore from "./portfolioSql.js";

const useSql = Boolean(process.env.DATABASE_URL);
const store = useSql ? sqlStore : fileStore;

export const storageMode = useSql ? "postgres" : "file";
export const listHoldings = store.listHoldings;
export const addHolding = store.addHolding;
export const updateHolding = store.updateHolding;
export const deleteHolding = store.deleteHolding;
