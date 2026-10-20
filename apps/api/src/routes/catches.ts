import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { bagDay, daysBetween, fishById, isGolden, isTaggable, isLakeHour, isLakeSeason, isLocalDay, isSky, TAG_FINDER_BONUS, TAG_WINDOW_DAYS, taggedWeightFits, validateCatch, SPOT_IDS, type CatchSubmission } from "@stillwater/shared";
import { countCatches, findCatchByRequestId, findLodgeRelease, getProfile, heaviestCatch, listCatchDays, othersHeaviestCatch, recordCatch, releaseCatch, toProfile, type CatchRow } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const catchRoutes = new Hono();

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sameCatch(row: CatchRow, body: CatchSubmission) {
  return row.species_id === body.speciesId && row.weight === body.weight && row.spot === body.spot &&
    row.clean === (body.clean ? 1 : 0) && row.hour === (body.hour ?? null) && row.sky === (body.sky ?? null) &&
    row.season === (body.season ?? null) && row.day === (body.day ?? null);
}

/** Other anglers' let-go fish come back from TAG_WINDOW_DAYS ago up to the start of today (UTC). */
export function tagWindow(at = new Date()): [string, string] {
  const today = bagDay(at).from;
  return [new Date(new Date(today).getTime() - TAG_WINDOW_DAYS * 86_400_000).toISOString(), today];
}

catchRoutes.post("/catches", async (c) => {
  const user = c.get("user") as SessionUser;
  let body: CatchSubmission;
  try {
    body = (await c.req.json()) as CatchSubmission;
  } catch {
    return c.json({ error: "invalid JSON" }, 400);
  }
  if (
    !body?.speciesId ||
    typeof body.weight !== "number" ||
    !SPOT_IDS.includes(body.spot) ||
    typeof body.requestId !== "string" ||
    !requestIdPattern.test(body.requestId) ||
    (body.clean !== undefined && typeof body.clean !== "boolean") ||
    (body.cleanRun !== undefined && (!Number.isInteger(body.cleanRun) || body.cleanRun < 0)) ||
    (body.taggedFrom !== undefined && (typeof body.taggedFrom !== "string" || !requestIdPattern.test(body.taggedFrom))) ||
    (body.hour !== undefined && (typeof body.hour !== "string" || !isLakeHour(body.hour))) ||
    (body.sky !== undefined && !isSky(body.sky)) ||
    (body.season !== undefined && !isLakeSeason(body.season)) ||
    // A queued catch may post days late, but no angler's day is more than one ahead of UTC.
    (body.day !== undefined && (!isLocalDay(body.day) || daysBetween(new Date().toISOString().slice(0, 10), body.day) > 1))
  ) {
    return c.json({ error: "invalid catch" }, 400);
  }
  const previous = findCatchByRequestId(user.id, body.requestId);
  if (previous) {
    if (!sameCatch(previous, body)) {
      return c.json({ error: "request ID conflicts with an existing catch" }, 409);
    }
    return c.json({ id: previous.id, points: previous.points, speciesId: previous.species_id, weight: previous.weight });
  }
  const row = getProfile(user.id);
  if (!row) return c.json({ error: "profile missing" }, 404);
  const result = validateCatch(toProfile(row), body, new Date(), heaviestCatch(user.id, body.speciesId), othersHeaviestCatch(user.id, body.speciesId), listCatchDays(user.id), countCatches(user.id, body.speciesId));
  if (!result.ok) return c.json({ error: result.error }, result.status);
  // Another angler's let-go fish must still be in the lake: theirs, the same kind at the same bank, let go before today, grown no more than it could.
  // One that isn't (another angler landed it first) is saved as a plain catch, so the fish is never lost.
  const found = body.taggedFrom ? findLodgeRelease(user.id, body.taggedFrom, ...tagWindow()) : undefined;
  const kind = fishById(found?.speciesId ?? "");
  const tag = found && isTaggable(kind) && found.speciesId === body.speciesId && found.spot === body.spot && taggedWeightFits(kind, found.weight, body.weight) ? found : undefined;
  const record: CatchRow = {
    id: randomUUID(),
    user_id: user.id,
    species_id: body.speciesId,
    weight: body.weight,
    points: result.points + (tag ? TAG_FINDER_BONUS : 0),
    spot: body.spot,
    request_id: body.requestId,
    clean: body.clean ? 1 : 0,
    hour: body.hour ?? null,
    sky: body.sky ?? null,
    season: body.season ?? null,
    golden: isGolden(body.requestId) ? 1 : 0,
    day: body.day ?? null,
    tagged_from: tag?.catchId ?? null,
    created_at: new Date().toISOString(),
  };
  const saved = recordCatch(record);
  if (saved.kind === "existing") {
    if (!sameCatch(saved.catch, body)) {
      return c.json({ error: "request ID conflicts with an existing catch" }, 409);
    }
    return c.json({
      id: saved.catch.id,
      points: saved.catch.points,
      speciesId: saved.catch.species_id,
      weight: saved.catch.weight,
    });
  }
  if (saved.kind === "rate_limited") return c.json({ error: "catch rate limit exceeded" }, 429);
  return c.json({
    id: record.id,
    points: record.points,
    speciesId: body.speciesId,
    weight: body.weight,
  });
});

// Letting the fish go is a choice made on the landed card, after the catch is saved; asking twice is harmless and pays nothing more.
catchRoutes.post("/catches/:requestId/release", (c) => {
  const user = c.get("user") as SessionUser;
  const requestId = c.req.param("requestId");
  if (!requestIdPattern.test(requestId)) return c.json({ error: "invalid request ID" }, 400);
  const released = releaseCatch(user.id, requestId);
  if (!released) return c.json({ error: "catch not found" }, 404);
  return c.json({ id: released.row.id, released: true, bonus: released.bonus });
});
