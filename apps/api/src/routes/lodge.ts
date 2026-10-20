import { Hono } from "hono";
import { BANK_STOCK_DAYS, tagWindow, TRACK_LIMIT, TRACK_WINDOW_MS, type LodgeTrack } from "@stillwater/shared";
import { listBankCounts, listLodgeReleases, listRecentLodgeCatches } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const lodgeRoutes = new Hono();

/** Every open dock polls this, so one read serves the whole lodge for a minute. */
const CACHE_MS = 60_000;
let cache: { at: number; rows: ReturnType<typeof listRecentLodgeCatches> } | null = null;

export function clearLodgeCache() {
  cache = null;
}

lodgeRoutes.get("/lodge/recent", (c) => {
  const user = c.get("user") as SessionUser;
  const now = Date.now();
  if (!cache || now - cache.at > CACHE_MS) {
    // Read past the limit so dropping the viewer's own catches still leaves a full list.
    cache = { at: now, rows: listRecentLodgeCatches(new Date(now - TRACK_WINDOW_MS).toISOString(), TRACK_LIMIT * 3) };
  }
  const tracks: LodgeTrack[] = cache.rows
    .filter((row) => row.userId !== user.id)
    .slice(0, TRACK_LIMIT)
    .map(({ userId: _owner, ...track }) => track);
  return c.json({ tracks });
});

/** Fish other anglers let go on earlier days that are still in the lake, for this angler's casts to find. */
lodgeRoutes.get("/lodge/released", (c) => {
  const user = c.get("user") as SessionUser;
  return c.json({ released: listLodgeReleases(user.id, ...tagWindow(), 50) });
});

/** How many fish the angler kept at each bank in the last BANK_STOCK_DAYS days, read once a visit. */
lodgeRoutes.get("/lodge/bank-week", (c) => {
  const user = c.get("user") as SessionUser;
  const since = new Date(Date.now() - BANK_STOCK_DAYS * 86_400_000).toISOString();
  return c.json({ counts: Object.fromEntries(listBankCounts(user.id, since).map((row) => [row.spot, row.count])) });
});
