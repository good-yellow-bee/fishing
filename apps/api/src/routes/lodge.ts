import { Hono } from "hono";
import { BANK_STOCK_DAYS, fishById, giantsForWeek, giantWeek, lostSince, reportsLost, SPOT_IDS, tagWindow, TRACK_LIMIT, TRACK_WINDOW_MS, type LodgeTrack } from "@stillwater/shared";
import { countReportedLost, ownsLost, listBankCounts, listGiantsLanded, listLodgeLost, listLodgeReleases, listMineFound, listRecentLodgeCatches, reportLost } from "../db.ts";
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

/** The week's giants, one per bank, and who landed each, if anyone has. */
lodgeRoutes.get("/lodge/giants", (c) => {
  const landed = new Map(listGiantsLanded(giantWeek()).map((row) => [row.spot, row]));
  return c.json({
    giants: giantsForWeek().map((giant) => {
      const by = landed.get(giant.spot);
      return { ...giant, landedBy: by?.displayName ?? null, landedAt: by?.landedAt ?? null };
    }),
  });
});

/** The client's id for a lost report, as for a catch's request. */
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Lost reports one angler may file in LOST_DAYS, landed since or not, so a flood of them can't crowd the lodge's list or be farmed. */
const LOST_REPORT_LIMIT = 3;

/** Files a trophy that broke the angler's line, for the rest of the lodge to meet at its bank. */
lodgeRoutes.post("/lodge/lost", async (c) => {
  const user = c.get("user") as SessionUser;
  const body = (await c.req.json().catch(() => null)) as { id?: unknown; speciesId?: unknown; weight?: unknown; spot?: unknown } | null;
  const species = typeof body?.speciesId === "string" ? fishById(body.speciesId) : undefined;
  const weight = typeof body?.weight === "number" ? body.weight : NaN;
  const spot = body?.spot;
  if (
    !species ||
    !Number.isFinite(weight) ||
    weight > species.maxWeight ||
    typeof spot !== "string" ||
    !(SPOT_IDS as readonly string[]).includes(spot) ||
    !species.spots.includes(spot as (typeof species.spots)[number]) ||
    !reportsLost(species, weight) ||
    (body?.id !== undefined && (typeof body.id !== "string" || !uuidPattern.test(body.id)))
  ) {
    return c.json({ error: "invalid lost fish" }, 400);
  }
  const id = typeof body?.id === "string" ? body.id : undefined;
  // A retry of a report already filed by this angler answers as filed, and doesn't count again.
  if (id && ownsLost(user.id, id)) return c.json({ id });
  if (countReportedLost(user.id, lostSince()) >= LOST_REPORT_LIMIT) return c.json({ error: "too many lost fish" }, 429);
  return c.json({ id: reportLost(user.id, { speciesId: species.id, weight, spot }, id) });
});

/** Other anglers' lost trophies still about their banks, and which of this angler's own someone else has landed. */
lodgeRoutes.get("/lodge/lost", (c) => {
  const user = c.get("user") as SessionUser;
  const since = lostSince();
  return c.json({ lost: listLodgeLost(user.id, since, 30), mineFound: listMineFound(user.id, since) });
});
