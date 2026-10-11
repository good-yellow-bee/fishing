import { Hono } from "hono";
import { TRACK_LIMIT, TRACK_WINDOW_MS, type LodgeTrack } from "@stillwater/shared";
import { listRecentLodgeCatches } from "../db.ts";
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
