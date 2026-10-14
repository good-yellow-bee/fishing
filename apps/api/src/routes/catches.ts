import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { isGolden, isLakeHour, isLakeSeason, isSky, validateCatch, SPOT_IDS, type CatchSubmission } from "@stillwater/shared";
import { findCatchByRequestId, getProfile, recordCatch, releaseCatch, toProfile, type CatchRow } from "../db.ts";
import type { SessionUser } from "../session.ts";

export const catchRoutes = new Hono();

const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sameCatch(row: CatchRow, body: CatchSubmission) {
  return row.species_id === body.speciesId && row.weight === body.weight && row.spot === body.spot &&
    row.clean === (body.clean ? 1 : 0) && row.hour === (body.hour ?? null) && row.sky === (body.sky ?? null) &&
    row.season === (body.season ?? null);
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
    (body.hour !== undefined && (typeof body.hour !== "string" || !isLakeHour(body.hour))) ||
    (body.sky !== undefined && !isSky(body.sky)) ||
    (body.season !== undefined && !isLakeSeason(body.season))
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
  const result = validateCatch(toProfile(row), body);
  if (!result.ok) return c.json({ error: result.error }, result.status);
  const record: CatchRow = {
    id: randomUUID(),
    user_id: user.id,
    species_id: body.speciesId,
    weight: body.weight,
    points: result.points,
    spot: body.spot,
    request_id: body.requestId,
    clean: body.clean ? 1 : 0,
    hour: body.hour ?? null,
    sky: body.sky ?? null,
    season: body.season ?? null,
    golden: isGolden(body.requestId) ? 1 : 0,
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
    points: result.points,
    speciesId: body.speciesId,
    weight: body.weight,
  });
});

// Letting the fish go is a choice made on the landed card, after the catch is saved; asking twice is harmless.
catchRoutes.post("/catches/:requestId/release", (c) => {
  const user = c.get("user") as SessionUser;
  const requestId = c.req.param("requestId");
  if (!requestIdPattern.test(requestId)) return c.json({ error: "invalid request ID" }, 400);
  const row = releaseCatch(user.id, requestId);
  if (!row) return c.json({ error: "catch not found" }, 404);
  return c.json({ id: row.id, released: true });
});
